-- Adicionar novos campos na tabela parcelas para suportar desconto e honorários
ALTER TABLE parcelas 
ADD COLUMN IF NOT EXISTS desconto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS honorarios numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS descricao text;

-- Atualizar o trigger de updated_at para a tabela parcelas
DROP TRIGGER IF EXISTS update_parcelas_updated_at ON parcelas;
CREATE TRIGGER update_parcelas_updated_at
  BEFORE UPDATE ON parcelas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();