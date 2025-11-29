import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, newPassword } = await req.json();

    if (!userId) {
      throw new Error("userId é obrigatório");
    }

    if (!newPassword) {
      throw new Error("newPassword é obrigatório");
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Update user password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Error updating password:", error);
      throw error;
    }

    // Also update primeira_senha_alterada to false so user knows to change it
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ primeira_senha_alterada: false })
      .eq("id", userId);

    if (profileError) {
      console.warn("Could not update profile:", profileError);
    }

    console.log(`Password reset successfully for user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Senha alterada com sucesso" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in reset-user-password:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro ao alterar senha" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
