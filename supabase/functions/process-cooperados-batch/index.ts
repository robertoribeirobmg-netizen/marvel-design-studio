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
  updated: number;
  associated: number;
  details: Array<{
    row: number;
    status: 'success' | 'error' | 'duplicate' | 'existing' | 'updated';
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
  return cpfStr.replace(/[^\d]/g, '').padStart(11, '0');
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

    // Auth + admin role enforcement
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleData } = await supabaseClient
      .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { cooperados } = await req.json();

    if (!cooperados || !Array.isArray(cooperados)) {
      throw new Error('Dados inválidos');
    }

    const result: ProcessResult = {
      success: 0,
      errors: 0,
      duplicates: 0,
      updated: 0,
      associated: 0,
      details: []
    };

    console.log(`Processando ${cooperados.length} cooperados...`);

    // Buscar TODOS os usuários do auth para verificar emails existentes
    const authUsersMap = new Map<string, { id: string }>();
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data: authUsersPage, error: authListError } = await supabaseClient.auth.admin.listUsers({
        page,
        perPage
      });
      
      if (authListError) {
        console.error('Erro ao listar usuários auth:', authListError);
        break;
      }
      
      if (!authUsersPage?.users || authUsersPage.users.length === 0) {
        break;
      }
      
      authUsersPage.users.forEach(u => {
        if (u.email) authUsersMap.set(u.email.toLowerCase(), { id: u.id });
      });
      
      if (authUsersPage.users.length < perPage) break;
      page++;
    }
    
    console.log(`Total de emails já cadastrados no auth: ${authUsersMap.size}`);

    // Buscar todos os compradores COHAPM para fazer matching
    const { data: compradores, error: compradoresError } = await supabaseClient
      .from('compradores_cohapm')
      .select('id, nome, cpf_cnpj, quadra, lote, profile_id');

    if (compradoresError) {
      console.error('Erro ao buscar compradores:', compradoresError);
    }

    // Buscar todos os profiles existentes para verificar CPF
    const { data: existingProfiles } = await supabaseClient
      .from('profiles')
      .select('id, email, cpf, nome_completo, quadra, lote, fase');

    // Criar mapas de profiles existentes por email e CPF
    const profilesByEmail = new Map<string, { id: string; nome: string; cpf: string | null }>();
    const profilesByCPF = new Map<string, { id: string; nome: string; email: string | null }>();
    
    if (existingProfiles) {
      existingProfiles.forEach(p => {
        if (p.email) profilesByEmail.set(p.email.toLowerCase(), { id: p.id, nome: p.nome_completo, cpf: p.cpf });
        if (p.cpf) profilesByCPF.set(normalizarCPF(p.cpf), { id: p.id, nome: p.nome_completo, email: p.email });
      });
    }

    // Set para controlar duplicatas no mesmo lote de importação
    const emailsNesteLote = new Set<string>();

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

        // Verificar duplicata no mesmo lote de importação
        if (emailsNesteLote.has(emailLower)) {
          result.duplicates++;
          result.details.push({
            row,
            status: 'duplicate',
            message: `Email duplicado neste lote de importação`,
            nome: coop.nome_completo,
            email: emailLower
          });
          continue;
        }

        // Validar tipo de usuário
        // 'admin' is intentionally excluded - admin creation must go through create-user
        const validRoles = ['cooperado', 'admin_obras', 'executivo_vendas'];
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

        // Gerar senha temporária (4 primeiros dígitos do CPF)
        const senhaTemp = cpfNormalizado.substring(0, 4);

        // Verificar se email já existe no auth.users
        const existingAuthUser = authUsersMap.get(emailLower);
        let userId: string;
        let isUpdate = false;

        if (existingAuthUser) {
          // Usuário já existe - vamos atualizar os dados
          userId = existingAuthUser.id;
          isUpdate = true;
          console.log(`Usuário existente encontrado: ${emailLower} (${userId})`);
        } else {
          // Verificar se CPF já existe em profile (mesmo que com outro email)
          const existingProfileByCPF = profilesByCPF.get(cpfNormalizado);
          
          if (existingProfileByCPF) {
            // CPF existe com outro email - atualizar esse profile
            userId = existingProfileByCPF.id;
            isUpdate = true;
            console.log(`Profile existente por CPF encontrado: ${cpfNormalizado} (${userId})`);
          } else {
            // Criar novo usuário no auth
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
              
              if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
                // Tentar buscar o usuário existente
                const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
                const found = existingUsers?.users?.find(u => u.email?.toLowerCase() === emailLower);
                
                if (found) {
                  userId = found.id;
                  isUpdate = true;
                  authUsersMap.set(emailLower, { id: userId });
                } else {
                  result.errors++;
                  result.details.push({
                    row,
                    status: 'error',
                    message: 'Email já registrado mas não foi possível localizar o usuário',
                    nome: coop.nome_completo,
                    email: emailLower
                  });
                  continue;
                }
              } else {
                result.errors++;
                result.details.push({
                  row,
                  status: 'error',
                  message: `Erro ao criar usuário: ${authError.message}`,
                  nome: coop.nome_completo
                });
                continue;
              }
            } else {
              userId = authUser.user.id;
              authUsersMap.set(emailLower, { id: userId });
            }
          }
        }

        // Marcar como processado neste lote
        emailsNesteLote.add(emailLower);

        // Preparar dados do profile
        const profileData = {
          id: userId,
          nome_completo: coop.nome_completo,
          email: emailLower,
          cpf: cpfNormalizado,
          telefone: coop.telefone || null,
          quadra: coop.quadra || null,
          lote: coop.lote || null,
          fase: coop.fase || null,
          primeira_senha_alterada: false
        };

        // Usar UPSERT para o profile
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .upsert(profileData, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Erro ao criar/atualizar profile:', profileError);
          
          // Se foi criado um novo usuário e deu erro no profile, reverter
          if (!isUpdate) {
            await supabaseClient.auth.admin.deleteUser(userId);
          }
          
          result.errors++;
          result.details.push({
            row,
            status: 'error',
            message: `Erro ao criar/atualizar perfil: ${profileError.message}`,
            nome: coop.nome_completo
          });
          continue;
        }

        // Atualizar mapas
        profilesByEmail.set(emailLower, { id: userId, nome: coop.nome_completo, cpf: cpfNormalizado });
        profilesByCPF.set(cpfNormalizado, { id: userId, nome: coop.nome_completo, email: emailLower });

        // Atribuir role (usar upsert para evitar duplicatas)
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: role as 'cooperado' | 'admin' | 'admin_obras' | 'executivo_vendas'
          }, {
            onConflict: 'user_id,role'
          });

        if (roleError) {
          console.error('Erro ao atribuir role:', roleError);
        }

        // Criar chave de vinculação para buscar comprador COHAPM
        const chaveVinculacao = criarChaveVinculacao(
          coop.nome_completo,
          cpfNormalizado,
          coop.quadra,
          coop.lote
        );

        // Tentar encontrar TODOS os compradores COHAPM correspondentes (por CPF ou chave)
        let compradoresVinculados = 0;
        if (compradores) {
          // Buscar por CPF normalizado ou por chave de vinculação
          const matchingCompradores = compradores.filter(comp => {
            // Já vinculado a outro profile
            if (comp.profile_id && comp.profile_id !== userId) return false;
            
            // Match por CPF
            const compCPF = normalizarCPF(comp.cpf_cnpj);
            if (compCPF === cpfNormalizado && cpfNormalizado.length >= 11) {
              return true;
            }
            
            // Match por chave de vinculação
            const compChave = criarChaveVinculacao(
              comp.nome || '',
              comp.cpf_cnpj || '',
              comp.quadra,
              comp.lote
            );
            
            return compChave === chaveVinculacao;
          });

          // Vincular todos os compradores encontrados
          for (const comp of matchingCompradores) {
            const { error: linkError } = await supabaseClient
              .from('compradores_cohapm')
              .update({ profile_id: userId })
              .eq('id', comp.id);

            if (linkError) {
              console.error(`Erro ao vincular COHAPM ${comp.id}:`, linkError);
            } else {
              compradoresVinculados++;
              console.log(`Vinculado ao comprador COHAPM: ${comp.id} (${comp.nome})`);
            }
          }
        }

        if (compradoresVinculados > 0) {
          result.associated += compradoresVinculados;
        }

        // Contabilizar resultado
        if (isUpdate) {
          result.updated++;
          result.details.push({
            row,
            status: 'updated',
            message: compradoresVinculados > 0
              ? `Dados atualizados e vinculado a ${compradoresVinculados} registro(s) financeiro(s)`
              : 'Dados do cooperado atualizados',
            nome: coop.nome_completo,
            email: emailLower,
            senha: senhaTemp
          });
        } else {
          result.success++;
          result.details.push({
            row,
            status: 'success',
            message: compradoresVinculados > 0
              ? `Cooperado cadastrado e vinculado a ${compradoresVinculados} registro(s) financeiro(s)`
              : 'Cooperado cadastrado com sucesso',
            nome: coop.nome_completo,
            email: emailLower,
            senha: senhaTemp
          });
        }

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
      updated: result.updated,
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
