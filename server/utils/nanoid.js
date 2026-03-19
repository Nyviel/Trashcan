const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function nanoid(len = 6) {
  let id = '';
  for (let i = 0; i < len; i++) id += CHARS[Math.floor(Math.random() * CHARS.length)];
  return id;
}
module.exports = { nanoid };
