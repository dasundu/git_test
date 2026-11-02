import Prose from "@/components/Prose";
export const metadata = { title: "Terms of use" };
export default function Terms() {
  return (
    <Prose title="Terms of use" note="Starter template — have a Philippine lawyer review and adapt this before launch.">
      <h2>1. What we are</h2>
      <p>We operate an online marketplace where dealerships and individuals advertise used, Japan-surplus and secondhand trucks and heavy equipment. We are not the seller of any vehicle and are not a party to any sale between buyers and sellers.</p>
      <h2>2. Accounts</h2>
      <p>You must provide accurate information and keep your password secure. We may suspend accounts that break these terms.</p>
      <h2>3. Listings</h2>
      <ul><li>Listings must be accurate, for vehicles you are entitled to sell, and have genuine photos.</li><li>Sellers must keep availability and prices up to date.</li><li>We may hide or remove listings that are misleading, fraudulent or break the law.</li><li>Free listing allowances and future fees are set by us and may change.</li></ul>
      <h2>4. Offers and chat</h2>
      <p>Offers on the platform are for negotiation only. Accepting an offer does not complete a sale or create a binding contract. Buyers and sellers are responsible for agreeing payment, documentation and handover terms.</p>
      <h2>5. Verified Dealer badge</h2>
      <p>The badge means our team has checked the dealership's business identity and operations at the time of review. It is not a guarantee of any particular vehicle or transaction.</p>
      <h2>6. Liability</h2>
      <p>To the extent permitted by law, we are not liable for losses arising from transactions between users. Please read our <a className="underline" href="/safety">buying safely</a> tips.</p>
    </Prose>
  );
}
