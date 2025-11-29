import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CooperadoInput {
  row_number: number;
  tipo_usuario: string;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone?: string;
  quadra?: string;
  lote?: string;
  fase?: string;
}

interface ProcessResult {
  success: number;
  errors: number;
  duplicates: number;
  associated: number;
  details: Array<{
    row: number;
    status: 'success' | 'error' | 'duplicate' | 'existing';
    message: string;
    nome?: string;
    email?: string;
    senha?: string;
  }>;
}

// Função para normalizar CPF
function normalizarCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const cpfStr = String(cpf);
  return cpfStr.replace(/[^\d]/g, '');
}

// Função para normalizar texto
function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return '';
  const textoStr = String(texto);
  return textoStr
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// Função para criar chave de vinculação
function criarChaveVinculacao(nome: string, cpf: string, quadra?: string, lote?: string): string {
  const nomeNorm = normalizarTexto(nome);
  const cpfNorm = normalizarCPF(cpf);
  const quadraNorm = quadra ? normalizarTexto(quadra) : 'SEM_QUADRA';
  const loteNorm = lote ? normalizarTexto(lote) : 'SEM_LOTE';
  
  return `${nomeNorm}_${cpfNorm}_${quadraNorm}_${loteNorm}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { cooperados } = await req.json();

    if (!cooperados || !Array.isArray(cooperados)) {
      throw new Error('Dados inválidos');
    }

    const result: ProcessResult = {
      success: 0,
      errors: 0,
      duplicates: 0,
      associated: 0,
      details: []
    };

    console.log(`Processando ${cooperados.length} cooperados...`);

    // Buscar todos os compradores COHAPM para fazer matching
    const { data: compradores, error: compradoresError } = await supabaseClient
      .from('compradores_cohapm')
      .select('id, nome, cpf_cnpj, quadra, lote, profile_id');

    if (compradoresError) {
      console.error('Erro ao buscar compradores:', compradoresError);
    }

    // Buscar todos os profiles existentes para verificar duplicatas
    const { data: existingProfiles } = await supabaseClient
      .from('profiles')
      .select('id, email, cpf, nome_completo');

    // Criar mapa de emails e CPFs existentes
    const existingEmails = new Map<string, { id: string; nome: string }>();
    const existingCPFs = new Map<string, { id: string; nome: string }>();
    
    if (existingProfiles) {
      existingProfiles.forEach(p => {
        if (p.email) existingEmails.set(p.email.toLowerCase(), { id: p.id, nome: p.nome_completo });
        if (p.cpf) existingCPFs.set(normalizarCPF(p.cpf), { id: p.id, nome: p.nome_completo });
      });
    }

    // Processar cada cooperado
    for (const coop of cooperados) {
      const row = coop.row_number;
      
      try {
        // Validações básicas
        if (!coop.nome_completo || !coop.email || !coop.cpf) {
          result.errors++;
          result.details.push({
            row,
            status: 'error',
            message: 'Campos obrigatórios faltando (nome, email ou CPF)',
            nome: coop.nome_completo
          });
          continue;
        }

        const cpfNormalizado = normalizarCPF(coop.cpf);
        const emailLower = coop.email.toLowerCase().trim();

        // Verificar se email já existe
        const existingByEmail = existingEmails.get(emailLower);
        if (existingByEmail) {
          result.duplicates++;
          result.details.push({
            row,
            status: 'existing',
            message: `Email já cadastrado para: ${existingByEmail.nome}`,
            nome: coop.nome_completo,
            email: emailLower
          });
          continue;
        }

        // Verificar se CPF já existe
        const existingByCPF = existingCPFs.get(cpfNormalizado);
        if (existingByCPF) {
          result.duplicates++;
          result.details.push({
            row,
            status: 'existing',
            message: `CPF já cadastrado para: ${existingByCPF.nome}`,
            nome: coop.nome_completo,
            email: emailLower
          });
          continue;
        }

        // Validar tipo de usuário
        const validRoles = ['cooperado', 'admin', 'admin_obras', 'executivo_vendas'];
        const role = coop.tipo_usuario?.toLowerCase() || 'cooperado';
        
        if (!validRoles.includes(role)) {
          result.errors++;
          result.details.push({
            row,
            status: 'error',
            message: `Tipo de usuário inválido: ${coop.tipo_usuario}. Use: cooperado, admin, admin_obras ou executivo_vendas`,
            nome: coop.nome_completo
          });
          continue;
        }

        // Criar chave de vinculação
        const chaveVinculacao = criarChaveVinculacao(
          coop.nome_completo,
          cpfNormalizado,
          coop.quadra,
          coop.lote
        );

        // Tentar encontrar comprador COHAPM correspondente
        let compradorMatch = null;
        if (compradores) {
          compradorMatch = compradores.find(comp => {
            if (comp.profile_id) return false; // Já vinculado
            
            const compChave = criarChaveVinculacao(
              comp.nome || '',
              comp.cpf_cnpj || '',
              comp.quadra,
              comp.lote
            );
            
            return compChave === chaveVinculacao;
          });
        }

        // Gerar senha temporária (4 primeiros dígitos do CPF)
        const senhaTemp = cpfNormalizado.substring(0, 4);

        // Criar usuário no auth
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
          email: emailLower,
          password: senhaTemp,
          email_confirm: true,
          user_metadata: {
            nome_completo: coop.nome_completo
          }
        });

        if (authError) {
          console.error('Erro ao criar usuário:', authError);
          
          // Se email já existe, marcar como duplicado
          if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
            result.duplicates++;
            result.details.push({
              row,
              status: 'existing',
              message: 'Email já registrado no sistema de autenticação',
              nome: coop.nome_completo,
              email: emailLower
            });
          } else {
            result.errors++;
            result.details.push({
              row,
              status: 'error',
              message: `Erro ao criar usuário: ${authError.message}`,
              nome: coop.nome_completo
            });
          }
          continue;
        }

        const userId = authUser.user.id;

        // Criar profile
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: userId,
            nome_completo: coop.nome_completo,
            email: emailLower,
            cpf: cpfNormalizado,
            telefone: coop.telefone || null,
            quadra: coop.quadra || null,
            lote: coop.lote || null,
            fase: coop.fase || null,
            primeira_senha_alterada: false
          });

        if (profileError) {
          console.error('Erro ao criar profile:', profileError);
          // Reverter criação do usuário
          await supabaseClient.auth.admin.deleteUser(userId);
          
          result.errors++;
          result.details.push({
            row,
            status: 'error',
            message: `Erro ao criar perfil: ${profileError.message}`,
            nome: coop.nome_completo
          });
          continue;
        }

        // Adicionar ao mapa de existentes para evitar duplicatas no mesmo lote
        existingEmails.set(emailLower, { id: userId, nome: coop.nome_completo });
        existingCPFs.set(cpfNormalizado, { id: userId, nome: coop.nome_completo });

        // Atribuir role
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .insert({
            user_id: userId,
            role: role as 'cooperado' | 'admin' | 'admin_obras' | 'executivo_vendas'
          });

        if (roleError) {
          console.error('Erro ao atribuir role:', roleError);
        }

        // Vincular ao comprador COHAPM se encontrado
        if (compradorMatch) {
          const { error: linkError } = await supabaseClient
            .from('compradores_cohapm')
            .update({ profile_id: userId })
            .eq('id', compradorMatch.id);

          if (linkError) {
            console.error('Erro ao vincular COHAPM:', linkError);
          } else {
            result.associated++;
            console.log(`Vinculado ao comprador COHAPM: ${compradorMatch.id}`);
          }
        }

        result.success++;
        result.details.push({
          row,
          status: 'success',
          message: compradorMatch 
            ? `Cooperado cadastrado e vinculado aos dados financeiros`
            : 'Cooperado cadastrado com sucesso',
          nome: coop.nome_completo,
          email: emailLower,
          senha: senhaTemp
        });

      } catch (error) {
        console.error('Erro ao processar cooperado:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors++;
        result.details.push({
          row,
          status: 'error',
          message: `Erro: ${errorMessage}`,
          nome: coop.nome_completo
        });
      }
    }

    console.log('Resultado final:', JSON.stringify({
      success: result.success,
      errors: result.errors,
      duplicates: result.duplicates,
      associated: result.associated
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});