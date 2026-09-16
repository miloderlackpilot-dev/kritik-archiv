import '../styles/globals.css';
import Link from 'next/link';

export default function App({ Component, pageProps }) {
  return <><Component {...pageProps} /><footer className="container small" style={{ paddingBottom: 24, marginTop: 24 }}><Link href="/privacy">Datenschutz</Link>{' · '}<Link href="/imprint">Impressum</Link>{' · '}<Link href="/legal">Quellen- und Rechtshinweise</Link></footer></>;
}
