// Runs the whole suite in UTC+14 so any accidental use of the host time zone shows up as a failure.
export default function setup(): void {
  process.env.TZ = 'Pacific/Kiritimati';
}
