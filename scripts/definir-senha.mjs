// Gera o comando SQL para trocar a senha de um usuário (a senha nunca sai do seu computador).
// Uso:  npm install   (só na primeira vez)
//       node scripts/definir-senha.mjs
// Depois cole o SQL impresso no SQL Editor do Supabase e clique em Run.
import bcrypt from 'bcryptjs';
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
const linhas = rl[Symbol.asyncIterator]();
let oculto = false;
const escrever = rl._writeToOutput.bind(rl);
rl._writeToOutput = (s) => { if (!oculto) escrever(s); }; // esconde o que é digitado na senha

async function perguntar(texto, esconder = false) {
  process.stdout.write(texto);
  oculto = esconder;
  const { value = '' } = await linhas.next();
  oculto = false;
  if (esconder) process.stdout.write('\n');
  return value;
}

const email = (await perguntar('E-mail do usuário: ')).trim().toLowerCase();
const senha = await perguntar('Nova senha (não aparece ao digitar): ', true);
const confirma = await perguntar('Repita a nova senha: ', true);
rl.close();

if (!/^[^@\s']+@[^@\s']+\.[^@\s']+$/.test(email)) { console.error('E-mail inválido.'); process.exit(1); }
if (senha !== confirma) { console.error('As senhas não conferem.'); process.exit(1); }
if (senha.length < 8) { console.error('Use pelo menos 8 caracteres.'); process.exit(1); }

const hash = await bcrypt.hash(senha, 10);
console.log('\nCole no SQL Editor do Supabase:\n');
console.log(`update public.usuarios set senha_hash = '${hash}' where lower(email) = '${email}';\n`);
