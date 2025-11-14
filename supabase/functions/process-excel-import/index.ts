import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { read, utils } from 'https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3; // 3 imports per minute (strict for heavy operations)

// Helper function to check rate limit
async function checkRateLimit(supabase: any, identifier: string, endpoint: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);
  
  await supabase
    .from('rate_limits')
    .delete()
    .lt('window_start', windowStart.toISOString());
  
  const { data: rateLimit } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .single();
  
  if (rateLimit) {
    if (rateLimit.request_count >= MAX_REQUESTS_PER_WINDOW) {
      return { allowed: false, remaining: 0 };
    }
    
    await supabase
      .from('rate_limits')
      .update({ request_count: rateLimit.request_count + 1 })
      .eq('id', rateLimit.id);
    
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - rateLimit.request_count - 1 };
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: now.toISOString()
      });
    
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }
}

// Helper function to log security events
async function logSecurityEvent(
  supabase: any, 
  eventType: string, 
  req: Request,
  userId?: string,
  details?: any
) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  await supabase
    .from('security_logs')
    .insert({
      event_type: eventType,
      user_id: userId || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      endpoint: '/process-excel-import',
      details: details || {}
    });
}

interface ParcelaExcel {
  quadraLote: string;
  cliente: string;
  descricao: string;
  vencimento: string;
  valor: number;
  situacao: string;
  dataRecebimento: string;
  desconto: number;
  juros: number;
  honorarios: number;
  valorPago: number;
}

// Validation schema for Excel parcela data
const parcelaSchema = z.object({
  quadraLote: z.string()
    .trim()
    .min(1, 'Quadra/Lote é obrigatório')
    .max(100, 'Quadra/Lote deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-Z0-9\s\/\-]+$/, 'Quadra/Lote contém caracteres inválidos'),
  cliente: z.string()
    .trim()
    .min(1, 'Nome do cliente é obrigatório')
    .max(200, 'Nome do cliente deve ter no máximo 200 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome do cliente deve conter apenas letras e espaços'),
  descricao: z.string()
    .trim()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .default(''),
  vencimento: z.string()
    .min(1, 'Data de vencimento é obrigatória'),
  valor: z.number()
    .min(0, 'Valor não pode ser negativo')
    .max(999999999, 'Valor excede o limite máximo'),
  situacao: z.string()
    .trim()
    .max(50, 'Situação deve ter no máximo 50 caracteres'),
  dataRecebimento: z.string()
    .optional()
    .default(''),
  desconto: z.number()
    .min(0, 'Desconto não pode ser negativo')
    .max(999999999, 'Desconto excede o limite máximo')
    .default(0),
  juros: z.number()
    .min(0, 'Juros não pode ser negativo')
    .max(999999999, 'Juros excede o limite máximo')
    .default(0),
  honorarios: z.number()
    .min(0, 'Honorários não pode ser negativo')
    .max(999999999, 'Honorários excede o limite máximo')
    .default(0),
  valorPago: z.number()
    .min(0, 'Valor pago não pode ser negativo')
    .max(999999999, 'Valor pago excede o limite máximo')
    .default(0)
})

const parseValorMonetario = (valor: any): number => {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  
  const valorLimpo = valor
    .toString()
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  
  return parseFloat(valorLimpo) || 0;
};

const parseData = (dataStr: any): string | null => {
  if (!dataStr) return null;
  
  try {
    let data: Date;
    
    if (typeof dataStr === 'number') {
      // Excel serial date
      data = new Date((dataStr - 25569) * 86400 * 1000);
    } else if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        const [p1, p2, p3] = partes;
        const ano = p3.length === 2 ? (parseInt(p3) > 50 ? '19' + p3 : '20' + p3) : p3;
        data = new Date(`${ano}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`);
        
        if (isNaN(data.getTime())) {
          data = new Date(`${ano}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`);
        }
      } else {
        return null;
      }
    } else {
      data = new Date(dataStr);
    }
    
    if (isNaN(data.getTime())) return null;
    
    return data.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao parsear data:', dataStr, error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logSecurityEvent(supabase, 'failed_auth', req, undefined, { 
        error: 'No authorization header' 
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      await logSecurityEvent(supabase, 'failed_auth', req, undefined, { 
        error: 'Invalid token' 
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Check rate limit
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitCheck = await checkRateLimit(supabase, ipAddress, '/process-excel-import');
    
    if (!rateLimitCheck.allowed) {
      await logSecurityEvent(supabase, 'rate_limit_exceeded', req, user.id, {
        endpoint: '/process-excel-import',
        ip: ipAddress
      });
      return new Response(
        JSON.stringify({ error: 'Too many import requests. Please wait before trying again.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    // Get the Excel file from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      await logSecurityEvent(supabase, 'validation_error', req, user.id, {
        error: 'No file provided'
      });
      throw new Error('Nenhum arquivo foi enviado');
    }

    console.log('Processando arquivo:', file.name);
    
    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      await logSecurityEvent(supabase, 'validation_error', req, user.id, {
        error: 'Invalid file type',
        filename: file.name
      });
      throw new Error('Apenas arquivos Excel (.xlsx, .xls) são permitidos');
    }

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    console.log('Linhas encontradas:', jsonData.length);

    const linhas = jsonData.slice(1);
    const parcelasExcel: ParcelaExcel[] = [];
    const validationErrors: string[] = [];
    
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      if (!linha[0] || !linha[1]) continue;
      
      const parcelaData = {
        quadraLote: linha[0]?.toString().trim() || '',
        cliente: linha[1]?.toString().trim() || '',
        descricao: linha[2]?.toString().trim() || '',
        vencimento: linha[3]?.toString() || '',
        valor: parseValorMonetario(linha[4]),
        situacao: linha[5]?.toString().trim() || '',
        dataRecebimento: linha[6]?.toString() || '',
        desconto: parseValorMonetario(linha[7]),
        juros: parseValorMonetario(linha[8]),
        honorarios: parseValorMonetario(linha[9]),
        valorPago: parseValorMonetario(linha[10]),
      };
      
      // Validate each parcela
      const validationResult = parcelaSchema.safeParse(parcelaData);
      
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(issue => 
          `Linha ${i + 2}: ${issue.path.join('.')} - ${issue.message}`
        ).join('; ');
        validationErrors.push(errors);
        console.warn(`Validation error on line ${i + 2}:`, errors);
        continue; // Skip invalid rows
      }
      
      parcelasExcel.push(validationResult.data);
    }
    
    // If too many validation errors, abort
    if (validationErrors.length > 50) {
      await logSecurityEvent(supabase, 'validation_error', req, user?.id, {
        error: 'Too many validation errors in Excel file',
        error_count: validationErrors.length
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Muitos erros de validação no arquivo Excel',
          details: validationErrors.slice(0, 20) // Return first 20 errors
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Parcelas processadas:', parcelasExcel.length);
    
    if (validationErrors.length > 0) {
      console.warn(`${validationErrors.length} linhas com erros de validação foram ignoradas`);
    }

    // Agrupar por cliente
    const clientesMap = new Map<string, ParcelaExcel[]>();
    
    for (const parcela of parcelasExcel) {
      const clienteKey = `${parcela.cliente}|${parcela.quadraLote}`;
      if (!clientesMap.has(clienteKey)) {
        clientesMap.set(clienteKey, []);
      }
      clientesMap.get(clienteKey)!.push(parcela);
    }

    console.log('Clientes únicos encontrados:', clientesMap.size);

    // Processar cada cliente
    const results = {
      success: 0,
      errors: [] as string[],
      validationWarnings: validationErrors,
      cooperadosDetalhes: [] as any[],
    };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const [clienteKey, parcelas] of clientesMap.entries()) {
      const [cliente, quadraLote] = clienteKey.split('|');
      const [quadra, lote] = quadraLote.split('/').map(s => s.trim());

      try {
        // Buscar cooperado
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .eq('quadra', quadra)
          .eq('lote', lote)
          .maybeSingle();

        if (profileError) {
          results.errors.push(`Erro ao buscar cooperado ${cliente}: ${profileError.message}`);
          continue;
        }

        let profileId: string;

        if (!profile) {
          // Criar cooperado automaticamente
          const tempEmail = `${quadra}.${lote}@temp.cooperativa.com`;
          const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
          
          const authHeader = req.headers.get('Authorization');
          
          const createResponse = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader || '',
            },
            body: JSON.stringify({
              email: tempEmail,
              password: tempPassword,
              nome: cliente,
              quadra,
              lote,
            }),
          });

          const createData = await createResponse.json();

          if (!createResponse.ok || !createData?.userId) {
            results.errors.push(`Erro ao criar cooperado ${cliente}: ${createData?.error || 'Erro desconhecido'}`);
            continue;
          }

          profileId = createData.userId;
          console.log('Cooperado criado:', cliente, profileId);
        } else {
          profileId = profile.id;
          console.log('Cooperado encontrado:', cliente, profileId);
        }

        // Calcular estatísticas
        const valorTotal = parcelas.reduce((sum, p) => sum + p.valor, 0);
        const numeroParcelas = parcelas.length;
        const valorParcela = numeroParcelas > 0 ? valorTotal / numeroParcelas : 0;
        const primeiraData = parcelas.find(p => p.vencimento)?.vencimento || new Date().toISOString().split('T')[0];

        // Verificar investimento existente
        const { data: existingInv } = await supabase
          .from('investimentos')
          .select('id')
          .eq('user_id', profileId)
          .maybeSingle();

        let investimentoId: string;

        if (existingInv) {
          investimentoId = existingInv.id;
          console.log('Usando investimento existente:', investimentoId);
        } else {
          const { data: newInv, error: invError } = await supabase
            .from('investimentos')
            .insert({
              user_id: profileId,
              valor_total: valorTotal,
              numero_parcelas: numeroParcelas,
              valor_parcela: valorParcela,
              data_inicio: primeiraData,
              observacoes: `Importado automaticamente - ${quadraLote}`,
            })
            .select()
            .single();

          if (invError) {
            results.errors.push(`Erro ao criar investimento para ${cliente}: ${invError.message}`);
            continue;
          }

          investimentoId = newInv.id;
          console.log('Investimento criado:', investimentoId);
        }

        // Inserir parcelas
        const parcelasToInsert = parcelas
          .filter(p => p.vencimento)
          .map((p, idx) => ({
            investimento_id: investimentoId,
            numero_parcela: idx + 1,
            descricao: p.descricao,
            valor_parcela: p.valor,
            data_vencimento: parseData(p.vencimento)!,
            status: p.situacao.toLowerCase() === 'pago' ? 'paga' : 'pendente',
            data_pagamento: parseData(p.dataRecebimento),
            valor_pago: p.valorPago > 0 ? p.valorPago : null,
            desconto: p.desconto,
            juros: p.juros,
            multa: 0,
            honorarios: p.honorarios,
          }));

        if (parcelasToInsert.length > 0) {
          const { error: parcelasError } = await supabase
            .from('parcelas')
            .insert(parcelasToInsert);

          if (parcelasError) {
            results.errors.push(`Erro ao inserir parcelas para ${cliente}: ${parcelasError.message}`);
            continue;
          }

          console.log('Parcelas inseridas:', parcelasToInsert.length);
        }

        // Calcular estatísticas detalhadas
        let parcelasPagas = 0;
        let parcelasVencidas = 0;
        let parcelasAVencer = 0;
        let valorPago = 0;

        for (const p of parcelas) {
          if (p.situacao.toLowerCase() === 'pago') {
            parcelasPagas++;
            valorPago += p.valorPago;
          } else if (p.vencimento) {
            const dataVencimento = new Date(parseData(p.vencimento) || '');
            dataVencimento.setHours(0, 0, 0, 0);
            
            if (dataVencimento < hoje) {
              parcelasVencidas++;
            } else {
              parcelasAVencer++;
            }
          }
        }

        results.cooperadosDetalhes.push({
          cliente,
          quadraLote,
          totalParcelas: parcelas.length,
          parcelasPagas,
          parcelasVencidas,
          parcelasAVencer,
          valorTotal,
          valorPago,
          saldoDevedor: valorTotal - valorPago,
        });

        results.success++;
      } catch (error: any) {
        results.errors.push(`Erro ao processar ${cliente}: ${error.message}`);
        console.error('Erro ao processar cliente:', cliente, error);
      }
    }

    console.log('Importação concluída:', results);

    // Get user for logging
    const userAuthHeader = req.headers.get('Authorization');
    if (userAuthHeader) {
      const userToken = userAuthHeader.replace('Bearer ', '');
      const { data: { user: logUser } } = await supabase.auth.getUser(userToken);
      
      await logSecurityEvent(supabase, 'import_completed', req, logUser?.id, {
        success_count: results.success,
        errors_count: results.errors.length,
        validation_warnings_count: results.validationWarnings.length,
        cooperados_count: results.cooperadosDetalhes.length
      });
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro na função:', error);
    
    // Log import error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const errorAuthHeader = req.headers.get('Authorization');
      if (errorAuthHeader) {
        const errorToken = errorAuthHeader.replace('Bearer ', '');
        const { data: { user: errorUser } } = await supabase.auth.getUser(errorToken);
        await logSecurityEvent(supabase, 'import_error', req, errorUser?.id, {
          error: error.message
        });
      }
    } catch (logError) {
      console.error('Failed to log error event:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
