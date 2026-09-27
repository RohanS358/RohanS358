import Link from "next/link";

export const metadata = { title: "Lost" };

export default function NotFound() {
  return (
    <main className="lost">
      <p className="contact__kicker">404</p>
      <h1 className="contact__title">this page fell off the corkboard.</h1>
      <p className="contact__meta">the pin was loose. probably my fault.</p>
      <Link href="/" className="contact__mail">take me back home</Link>
    </main>
  );
}
