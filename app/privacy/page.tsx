export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-sm text-zinc-300 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-zinc-100">Privacy Policy</h1>
      <p>Last updated: June 2026</p>
      <p>
        SecureVibes collects the email address (and optionally an app URL) you submit through this page,
        plus basic analytics (page views, UTM parameters, hashed IP). This data is used solely to contact
        you about the security audit service and free scorecard you requested.
      </p>
      <p>
        We do not sell or share your data with third parties. Data is stored on Supabase (hosted
        infrastructure) and retained only as long as needed to provide the service.
      </p>
      <p>
        To request deletion of your data, email{" "}
        <a className="underline" href="mailto:hello@securevibes.dev">hello@securevibes.dev</a>.
      </p>
    </main>
  );
}
