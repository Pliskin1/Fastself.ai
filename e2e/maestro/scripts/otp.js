// Maestro runScript: reads the newest Mailpit message for EMAIL and exposes the 6-digit code as output.otp.
const q = encodeURIComponent('to:"' + EMAIL + '"');
let code = null;
for (let i = 0; i < 10 && !code; i++) {
  const res = http.get('http://127.0.0.1:54324/api/v1/search?query=' + q + '&limit=1');
  const data = json(res.body);
  const msg = data.messages && data.messages[0];
  if (msg) {
    const m = String(msg.Snippet || '').match(/\b(\d{6})\b/);
    if (m) code = m[1];
  }
}
if (!code) throw new Error('No OTP email for ' + EMAIL + ' in Mailpit');
output.otp = code;
