import Prose from "@/components/Prose";
export const metadata = { title: "Buying safely" };
export default function Safety() {
  return (
    <Prose title="Buying and selling safely">
      <ul>
        <li><b>Inspect in person</b> — or send a trusted mechanic — before paying anything.</li>
        <li><b>Check the papers</b>: OR/CR, deed of sale, and for Japan-surplus units the import and customs documents. Make sure the seller's name matches the registration.</li>
        <li><b>Beware of pressure</b> — "someone else is paying today" is a classic scam tactic.</li>
        <li><b>Never pay a deposit</b> to an unverified person you haven't met. Prefer bank transfers to named business accounts and get a signed receipt.</li>
        <li><b>Prefer verified dealers</b> — look for the Verified Dealer badge. It means our team checked the business, but you should still inspect the unit.</li>
        <li><b>Report anything suspicious</b> using the Report button on any listing.</li>
      </ul>
    </Prose>
  );
}
