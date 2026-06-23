'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const LANDING_CSS = `
  :root {
    --cream: oklch(0.965 0.015 76);
    --cream-2: oklch(0.945 0.018 74);
    --card: oklch(0.99 0.007 84);
    --ink: oklch(0.28 0.02 50);
    --muted: oklch(0.52 0.024 54);
    --faint: oklch(0.64 0.022 58);
    --terra: oklch(0.6 0.14 41);
    --terra-deep: oklch(0.46 0.115 39);
    --clay: oklch(0.36 0.075 41);
    --clay-d: oklch(0.3 0.06 40);
    --terra-soft: oklch(0.89 0.05 56);
    --line: oklch(0.87 0.018 70);
    --disp: "Space Grotesk", system-ui, sans-serif;
    --sans: "Hanken Grotesk", system-ui, sans-serif;
  }
  .lp * { box-sizing: border-box; margin: 0; padding: 0; }
  .lp { font-family: var(--sans); background: var(--cream); color: var(--ink); -webkit-font-smoothing: antialiased; line-height: 1.6; min-height: 100vh; }
  .lp .wrap { max-width: 1160px; margin: 0 auto; padding: 0 40px; }
  .lp h1, .lp h2, .lp h3 { font-family: var(--disp); font-weight: 700; letter-spacing: -0.025em; line-height: 1.02; }
  .lp .eyebrow { font-family: var(--disp); font-weight: 600; font-size: 12.5px; letter-spacing: 0.16em; text-transform: uppercase; }

  .lp nav { position: absolute; top: 0; left: 0; right: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 24px 40px; }
  .lp .brand { display: flex; align-items: baseline; gap: 9px; }
  .lp .brand .word { font-family: var(--disp); font-weight: 700; font-size: 23px; color: var(--cream); }
  .lp .brand .ar { font-family: "Reem Kufi", serif; font-size: 19px; color: var(--terra-soft); }
  .lp .nav-links { display: flex; align-items: center; gap: 30px; }
  .lp .nav-links a { color: color-mix(in oklch, var(--cream) 80%, transparent); text-decoration: none; font-size: 14.5px; font-weight: 500; transition: color .2s; }
  .lp .nav-links a:hover { color: var(--cream); }
  .lp .nav-cta { font-family: var(--sans); font-weight: 600; font-size: 14px; background: var(--cream); color: var(--terra-deep); border-radius: 100px; padding: 10px 20px; text-decoration: none; transition: transform .15s; }
  .lp .nav-cta:hover { transform: translateY(-1px); }

  .lp .hero { background: radial-gradient(120% 130% at 50% 0%, var(--terra) 0%, var(--terra-deep) 55%, var(--clay) 100%); color: var(--cream); text-align: center; padding: 150px 40px 120px; position: relative; overflow: hidden; }
  .lp .hero .eyebrow { color: var(--terra-soft); margin-bottom: 30px; opacity: 0; animation: rise .8s .1s forwards; }
  .lp .orb-stage { display: flex; justify-content: center; margin-bottom: 44px; }
  .lp .orb { position: relative; width: 150px; height: 150px; display: grid; place-items: center; }
  .lp .orb .core { width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, oklch(0.92 0.06 70), var(--terra-soft) 45%, oklch(0.7 0.13 50) 100%); box-shadow: 0 0 50px 6px color-mix(in oklch, var(--terra-soft) 55%, transparent), inset 0 -6px 16px color-mix(in oklch, var(--terra-deep) 40%, transparent); animation: breathe 3.6s ease-in-out infinite; z-index: 2; }
  .lp .orb .ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in oklch, var(--terra-soft) 60%, transparent); animation: ripple 3s ease-out infinite; }
  .lp .orb .ring:nth-child(2) { animation-delay: 1s; }
  .lp .orb .ring:nth-child(3) { animation-delay: 2s; }
  .lp .orb .owave { position: absolute; z-index: 3; display: flex; align-items: center; gap: 3px; height: 30px; }
  .lp .orb .owave span { width: 3px; border-radius: 3px; background: var(--clay); animation: ob 1s ease-in-out infinite; }
  @keyframes ob { 0%,100% { height: 6px; } 50% { height: var(--h,20px); } }
  @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
  @keyframes ripple { 0% { transform: scale(0.6); opacity: .8; } 100% { transform: scale(1.9); opacity: 0; } }
  @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  .lp .hero h1 { font-size: clamp(44px, 7.5vw, 92px); margin-bottom: 24px; text-wrap: balance; opacity: 0; animation: rise .8s .2s forwards; }
  .lp .hero h1 .o { color: var(--terra-soft); }
  .lp .hero .lede { font-size: clamp(17px, 2.1vw, 21px); color: color-mix(in oklch, var(--cream) 82%, transparent); max-width: 560px; margin: 0 auto 40px; text-wrap: pretty; opacity: 0; animation: rise .8s .3s forwards; }
  .lp .hero .signup { max-width: 460px; margin: 0 auto; opacity: 0; animation: rise .8s .42s forwards; }
  .lp .hero .signup form { display: flex; gap: 7px; background: var(--cream); border-radius: 100px; padding: 7px 7px 7px 8px; box-shadow: 0 20px 50px -16px rgba(40,20,10,.5); }
  .lp .hero .signup input { flex: 1; border: none; background: transparent; padding: 0 16px; font-family: var(--sans); font-size: 15.5px; color: var(--ink); outline: none; min-width: 0; }
  .lp .hero .signup input::placeholder { color: var(--faint); }
  .lp .hero .signup button { font-family: var(--sans); font-weight: 600; font-size: 14.5px; white-space: nowrap; background: var(--terra-deep); color: #fff; border: none; border-radius: 100px; padding: 13px 24px; cursor: pointer; transition: background .2s; }
  .lp .hero .signup button:hover { background: var(--clay); }
  .lp .hero .signup .note { font-size: 13.5px; color: color-mix(in oklch, var(--cream) 72%, transparent); margin-top: 16px; }
  .lp .hero .signup.done form, .lp .hero .signup.done .note { display: none; }
  .lp .hero .signup .ok { display: none; font-size: 16px; font-weight: 500; padding: 12px; }
  .lp .hero .signup.done .ok { display: block; }

  .lp section { padding: 96px 0; }
  .lp .eyebrow.t { color: var(--terra); }
  .lp .section-head { margin-bottom: 60px; }
  .lp .section-head .eyebrow { display: block; margin-bottom: 18px; }
  .lp .section-head h2 { font-size: clamp(32px, 4.6vw, 56px); text-wrap: balance; }
  .lp .section-head.center { text-align: center; }
  .lp .section-head.center h2 { max-width: 720px; margin: 0 auto; }

  .lp .problem { background: var(--clay); color: var(--cream); }
  .lp .problem .pgrid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 56px; align-items: center; }
  .lp .problem .eyebrow { color: var(--terra-soft); display: block; margin-bottom: 20px; }
  .lp .problem h2 { color: var(--cream); font-size: clamp(30px, 4.2vw, 50px); text-wrap: balance; }
  .lp .problem p { font-size: clamp(17px, 1.9vw, 21px); color: color-mix(in oklch, var(--cream) 82%, transparent); text-wrap: pretty; }
  .lp .problem p .hl { color: var(--terra-soft); font-weight: 600; }
  .lp .problem p + p { margin-top: 20px; }

  .lp .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .lp .scard { border-top: 3px solid var(--terra); padding-top: 26px; }
  .lp .scard .num { font-family: var(--disp); font-weight: 700; font-size: 17px; color: var(--terra); letter-spacing: 0.1em; margin-bottom: 18px; }
  .lp .scard h3 { font-size: 27px; margin-bottom: 12px; }
  .lp .scard p { color: var(--muted); font-size: 16px; }

  .lp .pricing { background: var(--cream-2); }
  .lp .plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
  .lp .plan { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 36px 30px; display: flex; flex-direction: column; }
  .lp .plan.feat { background: var(--clay); color: var(--cream); border-color: var(--clay); transform: scale(1.04); box-shadow: 0 30px 60px -24px color-mix(in oklch, var(--clay) 70%, transparent); }
  .lp .plan .badge { align-self: flex-start; font-family: var(--disp); font-weight: 600; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; background: var(--terra); color: #fff; padding: 5px 12px; border-radius: 100px; margin-bottom: 16px; }
  .lp .plan .pname { font-family: var(--disp); font-weight: 600; font-size: 19px; margin-bottom: 6px; }
  .lp .plan .price { font-family: var(--disp); font-weight: 700; font-size: 46px; margin: 6px 0 2px; }
  .lp .plan .price small { font-family: var(--sans); font-size: 15px; font-weight: 500; opacity: .6; }
  .lp .plan .ptag { font-size: 14px; color: var(--muted); margin-bottom: 24px; min-height: 38px; }
  .lp .plan.feat .ptag { color: color-mix(in oklch, var(--cream) 75%, transparent); }
  .lp .plan ul { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; flex: 1; }
  .lp .plan li { font-size: 14.5px; color: var(--muted); padding-left: 24px; position: relative; }
  .lp .plan.feat li { color: color-mix(in oklch, var(--cream) 82%, transparent); }
  .lp .plan li::before { content: ""; position: absolute; left: 0; top: 7px; width: 9px; height: 9px; border-radius: 2px; background: var(--terra); transform: rotate(45deg); }
  .lp .plan .pbtn { text-align: center; font-family: var(--sans); font-weight: 600; font-size: 14.5px; padding: 13px; border-radius: 100px; text-decoration: none; cursor: pointer; transition: all .2s; border: 1.5px solid var(--ink); color: var(--ink); display: block; }
  .lp .plan .pbtn:hover { background: var(--ink); color: var(--cream); }
  .lp .plan.feat .pbtn { background: var(--cream); border-color: var(--cream); color: var(--clay); }
  .lp .plan.feat .pbtn:hover { background: var(--terra-soft); border-color: var(--terra-soft); }
  .lp .pricing .footnote { text-align: center; font-size: 14px; color: var(--faint); margin-top: 34px; }

  .lp .quotes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .lp .quote { padding: 32px 28px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); }
  .lp .quote .mark { font-family: var(--disp); font-weight: 700; font-size: 48px; color: var(--terra); line-height: 0.6; height: 26px; }
  .lp .quote blockquote { font-size: 18px; line-height: 1.5; margin-bottom: 22px; text-wrap: pretty; }
  .lp .quote .who { display: flex; align-items: center; gap: 12px; }
  .lp .quote .av { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; font-family: var(--disp); font-weight: 600; color: #fff; background: var(--terra); flex-shrink: 0; }
  .lp .quote .who div { font-size: 13.5px; color: var(--muted); }
  .lp .quote .who b { display: block; color: var(--ink); font-weight: 600; }

  .lp .faq-list { max-width: 820px; }
  .lp .faq-item { border-bottom: 1px solid var(--line); }
  .lp .faq-item:first-child { border-top: 1px solid var(--line); }
  .lp .faq-q { width: 100%; text-align: left; background: none; border: none; cursor: pointer; font-family: var(--disp); font-weight: 600; font-size: 20px; color: var(--ink); padding: 26px 44px 26px 0; position: relative; }
  .lp .faq-q .ic { position: absolute; right: 2px; top: 50%; width: 16px; height: 16px; transform: translateY(-50%); }
  .lp .faq-q .ic::before, .lp .faq-q .ic::after { content: ""; position: absolute; background: var(--terra); border-radius: 2px; top: 7px; left: 0; width: 16px; height: 2px; transition: transform .3s; }
  .lp .faq-q .ic::after { transform: rotate(90deg); }
  .lp .faq-item.open .ic::after { transform: rotate(0); }
  .lp .faq-a { max-height: 0; overflow: hidden; transition: max-height .35s ease; }
  .lp .faq-a p { color: var(--muted); font-size: 16px; padding: 0 44px 26px 0; max-width: 680px; }

  .lp .endcta { background: radial-gradient(120% 140% at 50% 100%, var(--terra) 0%, var(--terra-deep) 60%, var(--clay) 100%); color: var(--cream); text-align: center; }
  .lp .endcta h2 { color: var(--cream); font-size: clamp(34px, 5.4vw, 64px); margin-bottom: 18px; text-wrap: balance; }
  .lp .endcta h2 .o { color: var(--terra-soft); }
  .lp .endcta p { color: color-mix(in oklch, var(--cream) 82%, transparent); font-size: 18px; margin-bottom: 36px; }
  .lp .endcta .signup { max-width: 460px; margin: 0 auto; }
  .lp .endcta .signup form { display: flex; gap: 7px; background: var(--cream); border-radius: 100px; padding: 7px 7px 7px 8px; box-shadow: 0 20px 50px -16px rgba(40,20,10,.5); }
  .lp .endcta .signup input { flex: 1; border: none; background: transparent; padding: 0 16px; font-family: var(--sans); font-size: 15.5px; color: var(--ink); outline: none; min-width: 0; }
  .lp .endcta .signup button { font-family: var(--sans); font-weight: 600; font-size: 14.5px; white-space: nowrap; background: var(--terra-deep); color: #fff; border: none; border-radius: 100px; padding: 13px 24px; cursor: pointer; }
  .lp .endcta .signup button:hover { background: var(--clay); }
  .lp .endcta .signup.done form { display: none; }
  .lp .endcta .signup .ok { display: none; font-size: 16px; font-weight: 500; }
  .lp .endcta .signup.done .ok { display: block; }

  .lp footer { background: var(--clay-d); color: color-mix(in oklch, var(--cream) 70%, transparent); padding: 50px 40px; }
  .lp .foot-row { max-width: 1160px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 18px; }
  .lp footer .brand .word { color: var(--cream); }
  .lp .foot-links { display: flex; gap: 24px; }
  .lp .foot-links a { color: color-mix(in oklch, var(--cream) 65%, transparent); text-decoration: none; font-size: 14px; }
  .lp .foot-links a:hover { color: var(--cream); }
  .lp .foot-row .cr { font-size: 13px; color: color-mix(in oklch, var(--cream) 50%, transparent); }

  @media (max-width: 920px) {
    .lp .nav-links { display: none; }
    .lp nav { padding: 20px 24px; }
    .lp .wrap { padding: 0 24px; }
    .lp section { padding: 72px 0; }
    .lp .hero { padding: 116px 24px 88px; }
    .lp .section-head { margin-bottom: 44px; }
    .lp .problem .pgrid { grid-template-columns: 1fr; gap: 24px; }
    .lp .steps, .lp .quotes { grid-template-columns: repeat(2, 1fr); gap: 22px; }
    .lp .plans { grid-template-columns: 1fr; max-width: 440px; margin: 0 auto; }
    .lp .plan.feat { transform: none; }
  }
  @media (max-width: 600px) {
    .lp nav { padding: 16px 20px; }
    .lp .nav-cta { padding: 11px 18px; }
    .lp .wrap { padding: 0 20px; }
    .lp section { padding: 56px 0; }
    .lp .hero { padding: 100px 20px 72px; }
    .lp .hero .eyebrow { margin-bottom: 24px; }
    .lp .orb-stage { margin-bottom: 34px; }
    .lp .orb { width: 120px; height: 120px; }
    .lp .orb .core { width: 74px; height: 74px; }
    .lp .hero h1 { margin-bottom: 18px; }
    .lp .hero .lede { font-size: 16.5px; margin-bottom: 30px; }
    .lp .section-head { margin-bottom: 36px; }
    .lp .steps, .lp .quotes { grid-template-columns: 1fr; gap: 18px; }
    .lp .scard { padding-top: 22px; }
    .lp .scard h3 { font-size: 24px; }
    .lp .plan { padding: 30px 24px; }
    .lp .faq-q { font-size: 18px; padding: 22px 40px 22px 0; }
    .lp .faq-a p { padding-right: 24px; }
    .lp .pricing .footnote { margin-top: 28px; }
    .lp footer { padding: 40px 24px; }
    .lp .foot-row { flex-direction: column; align-items: flex-start; gap: 22px; }
    .lp .hero .signup form, .lp .endcta .signup form { flex-direction: column; background: transparent; box-shadow: none; padding: 0; gap: 10px; }
    .lp .hero .signup input, .lp .endcta .signup input { width: 100%; background: var(--cream); border-radius: 100px; padding: 15px 22px; }
    .lp .hero .signup button, .lp .endcta .signup button { width: 100%; padding: 15px; }
    .lp .hero .signup .note { margin-top: 18px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lp .orb .core, .lp .orb .ring, .lp .orb .owave span { animation: none; }
    .lp .orb .ring { opacity: 0; }
    .lp * { animation-duration: .001s !important; }
  }
`

const FAQ_ITEMS = [
  {
    q: "Faut-il déjà parler un peu arabe ?",
    a: "Non. Takalam s'adapte du niveau grand débutant jusqu'au perfectionnement. Il commence exactement là où vous êtes.",
  },
  {
    q: "Arabe littéraire ou dialecte ?",
    a: "Les deux. Choisissez l'arabe littéraire (fusha) ou un dialecte — maghrébin, égyptien, levantin — selon votre objectif.",
  },
  {
    q: "Mes conversations sont-elles privées ?",
    a: "Oui. Vos enregistrements vous appartiennent. Ils ne servent qu'à votre progression et ne sont jamais partagés.",
  },
  {
    q: "Quand l'application sort-elle ?",
    a: "Lancement prévu à l'automne 2026. Inscrivez-vous pour un accès anticipé et les tarifs de lancement, bloqués à vie.",
  },
  {
    q: "Sur quels appareils ?",
    a: "iOS et Android au lancement, avec une version web qui suivra peu après.",
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const owaveRef = useRef<HTMLDivElement>(null)
  const faqRefs = useRef<(HTMLDivElement | null)[]>(Array(FAQ_ITEMS.length).fill(null))

  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [email1, setEmail1] = useState('')
  const [email2, setEmail2] = useState('')
  const [form1Done, setForm1Done] = useState(false)
  const [form2Done, setForm2Done] = useState(false)

  useEffect(() => {
    if (!isLoading && user) router.push('/app')
  }, [user, isLoading, router])

  useEffect(() => {
    const wave = owaveRef.current
    if (!wave) return
    for (let i = 0; i < 7; i++) {
      const s = document.createElement('span')
      const t = Math.sin((i / 6) * Math.PI)
      s.style.setProperty('--h', `${(8 + t * 16).toFixed(0)}px`)
      s.style.animationDelay = `${(i * 0.08).toFixed(2)}s`
      s.style.animationDuration = `${(0.8 + Math.random() * 0.5).toFixed(2)}s`
      wave.appendChild(s)
    }
    return () => { wave.innerHTML = '' }
  }, [])

  function handleForm1(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email1.trim())) return
    setForm1Done(true)
  }

  function handleForm2(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email2.trim())) return
    setForm2Done(true)
  }

  function toggleFaq(index: number) {
    const prev = openFaq
    const next = prev === index ? null : index

    if (prev !== null && faqRefs.current[prev]) {
      faqRefs.current[prev]!.style.maxHeight = ''
    }
    if (next !== null && faqRefs.current[next]) {
      faqRefs.current[next]!.style.maxHeight = `${faqRefs.current[next]!.scrollHeight}px`
    }
    setOpenFaq(next)
  }

  if (isLoading) return null

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div className="lp">
        <nav>
          <div className="brand">
            <span className="word">Takalam</span>
            <span className="ar">تكلّم</span>
          </div>
          <div className="nav-links">
            <a href="#how">Comment ça marche</a>
            <a href="#pricing">Tarifs</a>
            <a href="#faq">Questions</a>
          </div>
          <a href="#join" className="nav-cta">Accès anticipé</a>
        </nav>

        <header className="hero">
          <span className="eyebrow">Apprendre l&apos;arabe par la voix</span>
          <div className="orb-stage">
            <div className="orb">
              <div className="ring" />
              <div className="ring" />
              <div className="ring" />
              <div className="core" />
              <div className="owave" ref={owaveRef} />
            </div>
          </div>
          <h1>Osez parler.<br /><span className="o">Vraiment.</span></h1>
          <p className="lede">
            Takalam est votre partenaire de conversation par IA vocale. Vous parlez, il répond, vous progressez — sans jugement, sans public, sans la peur de mal faire.
          </p>
          <div className={`signup${form1Done ? ' done' : ''}`} id="join">
            <form onSubmit={handleForm1}>
              <input
                type="email"
                name="email"
                placeholder="votre@email.com"
                required
                aria-label="Adresse email"
                value={email1}
                onChange={e => setEmail1(e.target.value)}
              />
              <button type="submit">Rejoindre la liste</button>
            </form>
            <p className="note">Lancement automne 2026 · Tarifs de lancement bloqués à vie · Pas de spam</p>
            <p className="ok">Merci&nbsp;! On vous écrit dès l&apos;ouverture des inscriptions.</p>
          </div>
        </header>

        <section className="problem">
          <div className="wrap">
            <div className="pgrid">
              <div>
                <span className="eyebrow">Le vrai blocage</span>
                <h2>La peur parle plus fort que vous.</h2>
              </div>
              <div>
                <p>
                  Ce qui vous empêche de parler n&apos;est ni le vocabulaire, ni la grammaire. C&apos;est{' '}
                  <span className="hl">la peur du regard des autres</span>{' '}
                  quand on bute sur un mot, quand l&apos;accent tremble, quand la phrase s&apos;arrête net.
                </p>
                <p>
                  Takalam enlève le public. Il ne reste que vous et la langue — autant d&apos;essais qu&apos;il vous faut, sans jugement.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow t">Comment ça marche</span>
              <h2>Trois gestes. Zéro pression.</h2>
            </div>
            <div className="steps">
              <div className="scard">
                <div className="num">01 — PARLEZ</div>
                <h3>Vous parlez</h3>
                <p>Lancez une conversation à voix haute, sur n&apos;importe quel sujet. En arabe littéraire ou en dialecte — maghrébin, égyptien, levantin.</p>
              </div>
              <div className="scard">
                <div className="num">02 — ÉCOUTEZ</div>
                <h3>Takalam répond</h3>
                <p>Une voix naturelle vous répond en temps réel, s&apos;adapte à votre niveau et reformule en douceur ce que vous cherchiez à dire.</p>
              </div>
              <div className="scard">
                <div className="num">03 — PROGRESSEZ</div>
                <h3>Vous progressez</h3>
                <p>Chaque échange est analysé. Un retour bienveillant, vos mots gagnés, un suivi clair — sans note ni classement.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="pricing" id="pricing">
          <div className="wrap">
            <div className="section-head center">
              <span className="eyebrow t">Tarifs</span>
              <h2>Commencez gratuitement. Restez si ça vous parle.</h2>
            </div>
            <div className="plans">
              <div className="plan">
                <div className="pname">Gratuit</div>
                <div className="price">0€</div>
                <div className="ptag">Pour goûter à la conversation, tous les jours.</div>
                <ul>
                  <li>10 minutes de conversation par jour</li>
                  <li>Un dialecte au choix</li>
                  <li>Suivi de progression de base</li>
                </ul>
                <a href="#join" className="pbtn">Commencer gratuitement</a>
              </div>
              <div className="plan feat">
                <span className="badge">Le plus choisi</span>
                <div className="pname">Pro</div>
                <div className="price">9€ <small>/ mois</small></div>
                <div className="ptag">Pour parler tous les jours, sans limite.</div>
                <ul>
                  <li>Conversations illimitées</li>
                  <li>Tous les dialectes + arabe littéraire</li>
                  <li>Retours détaillés après chaque échange</li>
                  <li>Mode hors-ligne</li>
                </ul>
                <a href="#join" className="pbtn">Choisir Pro</a>
              </div>
              <div className="plan">
                <div className="pname">Famille</div>
                <div className="price">19€ <small>/ mois</small></div>
                <div className="ptag">Pour apprendre ensemble, chacun son rythme.</div>
                <ul>
                  <li>Jusqu&apos;à 5 profils</li>
                  <li>Tout ce qu&apos;offre Pro, pour chacun</li>
                  <li>Contrôle parental + tableau de bord familial</li>
                </ul>
                <a href="#join" className="pbtn">Choisir Famille</a>
              </div>
            </div>
            <p className="footnote">Tarifs de lancement — bloqués à vie pour les premiers inscrits.</p>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head center">
              <span className="eyebrow t">Elles et ils ont osé</span>
              <h2>La confiance revient, une conversation à la fois.</h2>
            </div>
            <div className="quotes">
              <div className="quote">
                <div className="mark">&ldquo;</div>
                <blockquote>Pour la première fois, je n&apos;ai pas eu peur de me tromper.</blockquote>
                <div className="who">
                  <div className="av">Y</div>
                  <div><b>Yasmine</b>28 ans · Lyon</div>
                </div>
              </div>
              <div className="quote">
                <div className="mark">&ldquo;</div>
                <blockquote>Je révise dans la voiture le matin. Dix minutes, et ça rentre vraiment.</blockquote>
                <div className="who">
                  <div className="av">K</div>
                  <div><b>Karim</b>34 ans · Bruxelles</div>
                </div>
              </div>
              <div className="quote">
                <div className="mark">&ldquo;</div>
                <blockquote>Ma fille parle à Takalam comme à une amie. Elle a repris confiance.</blockquote>
                <div className="who">
                  <div className="av">L</div>
                  <div><b>Leïla</b>41 ans · Montréal</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pricing" id="faq">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow t">Questions fréquentes</span>
              <h2>Tout ce que vous vous demandez.</h2>
            </div>
            <div className="faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
                  <button className="faq-q" onClick={() => toggleFaq(i)}>
                    {item.q}<span className="ic" />
                  </button>
                  <div
                    className="faq-a"
                    ref={el => { faqRefs.current[i] = el }}
                  >
                    <p>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="endcta">
          <div className="wrap">
            <h2>Et si parler arabe devenait <span className="o">sans enjeu&nbsp;?</span></h2>
            <p>Rejoignez les premiers inscrits. On vous prévient dès l&apos;ouverture.</p>
            <div className={`signup${form2Done ? ' done' : ''}`}>
              <form onSubmit={handleForm2}>
                <input
                  type="email"
                  name="email"
                  placeholder="votre@email.com"
                  required
                  aria-label="Adresse email"
                  value={email2}
                  onChange={e => setEmail2(e.target.value)}
                />
                <button type="submit">Être prévenu</button>
              </form>
              <p className="ok">Merci&nbsp;! À très vite dans votre boîte mail.</p>
            </div>
          </div>
        </section>

        <footer>
          <div className="foot-row">
            <div className="brand">
              <span className="word">Takalam</span>
              <span className="ar">تكلّم</span>
            </div>
            <div className="foot-links">
              <a href="#">Confidentialité</a>
              <a href="#">Conditions</a>
              <a href="#">Contact</a>
            </div>
            <div className="cr">© 2026 Takalam — Apprendre à parler, sans la peur.</div>
          </div>
        </footer>
      </div>
    </>
  )
}
