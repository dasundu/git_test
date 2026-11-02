import Prose from "@/components/Prose";
export const metadata = { title: "Privacy policy" };
export default function Privacy() {
  return (
    <Prose title="Privacy policy" note="Starter template — have a Philippine lawyer review this against the Data Privacy Act of 2012 (RA 10173) before launch.">
      <h2>What we collect</h2>
      <p>Account details (name, email, mobile number), listing content and photos, messages and offers you send, and basic usage data such as listing views.</p>
      <h2>How we use it</h2>
      <ul><li>To run the marketplace: show listings, deliver messages and notifications, and let sellers manage offers.</li><li>To keep the platform safe: review reports and verify dealerships.</li><li>To email or push-notify you about activity on your account (you can turn email notifications off in Account settings).</li></ul>
      <h2>What others can see</h2>
      <p>Your name and listings are public. Dealership profiles show the contact details the dealership chooses to publish. Your email address is never shown publicly.</p>
      <h2>Your rights</h2>
      <p>You may ask to access, correct or delete your personal data by contacting us.</p>
    </Prose>
  );
}
