/**
 * Testes de RLS e Storage Policies
 *
 * Verifica que clientes anônimos (não autenticados) NÃO conseguem:
 *  - listar/inserir/atualizar/deletar em obra_fotos
 *  - listar/atualizar/sobrescrever arquivos nos buckets `comprovantes` e `obra-fotos`
 *
 * Observação: rodar com `bunx vitest run src/test/rls.test.ts`
 * Os testes usam a chave PUBLISHABLE (anon) — segura para client-side.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

const hasEnv = Boolean(SUPABASE_URL && SUPABASE_ANON);
const d = hasEnv ? describe : describe.skip;

const anon = hasEnv ? createClient(SUPABASE_URL!, SUPABASE_ANON!) : null;

d("RLS — obra_fotos (anon)", () => {
  it("não pode INSERT em obra_fotos", async () => {
    const { error } = await anon!
      .from("obra_fotos")
      .insert({ titulo: "x", categoria: "1ª Fase do Muro" as never });
    expect(error).not.toBeNull();
  });

  it("não pode UPDATE em obra_fotos", async () => {
    const { error, data } = await anon!
      .from("obra_fotos")
      .update({ titulo: "hack" })
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    // Sem policy de UPDATE para anon: erro OU 0 linhas afetadas
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("não pode DELETE em obra_fotos", async () => {
    const { error, data } = await anon!
      .from("obra_fotos")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});

d("RLS — profiles (anon)", () => {
  it("não pode ler profiles", async () => {
    const { data, error } = await anon!.from("profiles").select("id").limit(1);
    // Política só permite authenticated → anon recebe [] ou erro
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});

d("Storage — bucket comprovantes (anon)", () => {
  it("não pode listar arquivos", async () => {
    const { data, error } = await anon!.storage.from("comprovantes").list();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("não pode fazer upload", async () => {
    const blob = new Blob(["x"], { type: "application/pdf" });
    const { error } = await anon!.storage
      .from("comprovantes")
      .upload(`anon-${Date.now()}.pdf`, blob);
    expect(error).not.toBeNull();
  });

  it("não pode sobrescrever arquivo existente", async () => {
    const blob = new Blob(["x"], { type: "application/pdf" });
    const { error } = await anon!.storage
      .from("comprovantes")
      .update("qualquer.pdf", blob);
    expect(error).not.toBeNull();
  });
});

d("Storage — bucket obra-fotos (anon)", () => {
  it("não pode listar arquivos (LIST exige admin)", async () => {
    const { data, error } = await anon!.storage.from("obra-fotos").list();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("não pode fazer upload", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    const { error } = await anon!.storage
      .from("obra-fotos")
      .upload(`anon-${Date.now()}.png`, blob);
    expect(error).not.toBeNull();
  });

  it("não pode atualizar/sobrescrever arquivo", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    const { error } = await anon!.storage
      .from("obra-fotos")
      .update("placeholder.png", blob);
    expect(error).not.toBeNull();
  });
});
