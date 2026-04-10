'use client';

import { useState, useEffect, useMemo } from 'react';
import { Property } from '@/lib/types';
import { ChevronRight } from 'lucide-react';
import CoreOrb from '@/components/OrbLightning';
import { supabase } from '@/lib/supabase';

export default function CryptoTab({ properties }: { properties: Property[] }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskChecked, setRiskChecked] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('2500');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [connectError, setConnectError] = useState('');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenModal(null); };
    if (openModal) { window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc); }
  }, [openModal]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('avena_risk_accepted') === 'true') setRiskAccepted(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on?.('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) { setWalletAddress(null); setUsdtBalance(null); }
        else { setWalletAddress(accounts[0]); checkChainAndBalance(accounts[0]); }
      });
      (window as any).ethereum.on?.('chainChanged', () => window.location.reload());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const USDT_BSC = '0x55d398326f99059fF775485246999027B3197955';
  const VAULT_ADDRESS = '0x86D14d0d4a8B5934CC432689fB1415100d5021Cd';

  const checkChainAndBalance = async (addr: string) => {
    try {
      const eth = (window as any).ethereum;
      const chainId = await eth.request({ method: 'eth_chainId' });
      const onBsc = chainId === '0x38';
      setChainOk(onBsc);
      if (onBsc) {
        const data = '0x70a08231' + addr.slice(2).padStart(64, '0');
        const result = await eth.request({ method: 'eth_call', params: [{ to: USDT_BSC, data }, 'latest'] });
        const balance = parseInt(result, 16) / 1e18;
        setUsdtBalance(balance.toFixed(2));
      }
    } catch { /* silent */ }
  };

  const connectWallet = async (wallet: 'metamask' | 'trust') => {
    setConnectError('');
    try {
      const w = window as any;
      let eth: any = null;

      // When multiple wallets installed, they put themselves in providers array
      const providers = w.ethereum?.providers;

      if (wallet === 'metamask') {
        if (providers && Array.isArray(providers)) {
          // Find MetaMask specifically — it has isMetaMask=true
          // Trust also sets isMetaMask, so prefer the one WITHOUT isTrust
          eth = providers.find((p: any) => p.isMetaMask && !p.isTrustWallet && !p.isTrust);
          if (!eth) eth = providers.find((p: any) => p.isMetaMask);
        }
        if (!eth && w.ethereum?.isMetaMask && !w.ethereum?.isTrust && !w.ethereum?.isTrustWallet) {
          eth = w.ethereum;
        }
      } else {
        if (providers && Array.isArray(providers)) {
          eth = providers.find((p: any) => p.isTrust || p.isTrustWallet);
        }
        if (!eth && w.trustwallet) eth = w.trustwallet;
        if (!eth && (w.ethereum?.isTrust || w.ethereum?.isTrustWallet)) eth = w.ethereum;
      }

      // Final fallback — just use whatever is there
      if (!eth) eth = w.ethereum;
      if (!eth) { setConnectError('no-wallet'); return; }

      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) { setConnectError('No account returned'); return; }
      setWalletAddress(accounts[0]);
      await checkChainAndBalance(accounts[0]);
    } catch (err: any) {
      setConnectError(err?.message || 'Connection rejected');
    }
  };

  const switchToBsc = async () => {
    const eth = (window as any).ethereum;
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
    } catch (err: any) {
      if (err.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x38',
            chainName: 'Binance Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com/']
          }]
        });
      }
    }
    if (walletAddress) await checkChainAndBalance(walletAddress);
  };

  const reserveSlot = async () => {
    const amount = parseInt(contributionAmount);
    if (amount < 2500) return;
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress, amount, type: 'crypto_contribution' }),
      });
    } catch { /* silent */ }
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    if (!email.includes('@') || submitting) return;
    setSubmitting(true);
    try {
      if (supabase) {
        await supabase.from('email_captures').upsert({ email: email.toLowerCase().trim(), source: 'crypto' }, { onConflict: 'email' });
      }
      setSubmitted(true);
    } catch { /* silent */ }
    setSubmitting(false);
  };

  const fillPct = 0;


  return (
    <div className="w-full" style={{ background: '#090d12' }}>

      {/* ── TITLE BAR ── */}
      <div className="text-center pt-12 md:pt-16 pb-8 px-4">
        <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.3em] mb-3" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>THE AVENA EXPERIMENT</h1>
        <p className="text-gray-500 text-xs md:text-sm tracking-[0.15em]">One property. One raise. One outcome.</p>
        <div className="h-px w-full mt-8" style={{ background: '#1a2332' }} />
      </div>

      {/* ── THE CORE ── */}
      <div className="flex flex-col items-center justify-center py-12 md:py-20 relative">
        {/* Glow backdrop only — no sonar rings */}

        {/* The Core — unified canvas orb */}
        <CoreOrb size={280} fillPct={fillPct} />

        {/* Text below orb */}
        <div className="mt-8 text-center relative z-10">
          <h2 className="tracking-[0.4em] mb-2" style={{ fontSize: '2rem', fontWeight: 300, background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AVENA</h2>
          <div className="tracking-[0.15em] text-sm mb-4" style={{ color: '#10B981' }}>&euro;0 / &euro;450,000</div>

          {/* Progress bar */}
          <div className="mx-auto rounded-full overflow-hidden mb-6" style={{ width: 280, height: 4, background: '#1a2332' }}>
            <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: '#10B981' }} />
          </div>

          {/* Wallet Connection */}
          {!riskAccepted ? (
            <button onClick={() => setShowRiskModal(true)}
              className="px-8 py-3 rounded-lg text-sm font-bold border transition-all tracking-[0.1em]"
              style={{ borderColor: '#10B981', color: '#10B981', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.color = '#0d1117'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#10B981'; }}>
              Connect Wallet
            </button>
          ) : !walletAddress ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-3">
                <button onClick={() => connectWallet('metamask')} className="px-5 py-2.5 rounded-lg text-xs font-bold border transition-all" style={{ borderColor: '#F6851B', color: '#F6851B' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F6851B'; e.currentTarget.style.color = '#0d1117'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F6851B'; }}>
                  MetaMask
                </button>
                <button onClick={() => connectWallet('trust')} className="px-5 py-2.5 rounded-lg text-xs font-bold border transition-all" style={{ borderColor: '#3375BB', color: '#3375BB' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#3375BB'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3375BB'; }}>
                  Trust Wallet
                </button>
              </div>
              {connectError === 'no-wallet' && (
                <div className="text-xs text-gray-400 text-center">
                  No wallet detected. <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Install MetaMask</a> or open in <a href="https://trustwallet.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Trust Wallet Browser</a>
                </div>
              )}
              {connectError && connectError !== 'no-wallet' && <p className="text-xs text-red-400">{connectError}</p>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 font-mono text-xs">Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              </div>
              {!chainOk && (
                <div className="text-center">
                  <p className="text-xs text-yellow-400 mb-2">Wrong network. Switch to Binance Smart Chain.</p>
                  <button onClick={switchToBsc} className="px-4 py-2 rounded-lg text-xs font-bold" style={{ background: '#F59E0B', color: '#0d1117' }}>Switch to BSC</button>
                </div>
              )}
              {chainOk && usdtBalance !== null && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">USDT Balance: <span className="text-white font-bold">{usdtBalance} USDT</span></p>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <input type="number" min="2500" value={contributionAmount} onChange={e => setContributionAmount(e.target.value)}
                      className="w-48 px-4 py-2 rounded-lg text-sm text-white text-center outline-none" style={{ background: '#0d1117', border: '1px solid #1c2333' }} />
                    <p className="text-[10px] text-gray-500">{contributionAmount} USDT = {(parseInt(contributionAmount || '0') / 2500).toFixed(1)}/180 slots</p>
                    <p className="text-[10px] text-gray-600">Minimum: 2,500 USDT</p>
                    <button onClick={reserveSlot} disabled={parseInt(contributionAmount) < 2500}
                      className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-30" style={{ background: '#10B981', color: '#0d1117' }}>
                      REGISTER INTEREST →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MANIFESTO ── */}
      <div className="px-4 md:px-10 py-10" style={{ background: '#090d12' }}>
        <div className="max-w-[680px] mx-auto text-center">
          <div className="h-px w-full mb-10" style={{ background: '#1a2332' }} />
          <p className="text-base md:text-lg leading-relaxed mb-6 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #00b9ff, #9fe870)' }}>180 people. One wallet. One villa. Every euro visible on-chain. No fund manager. No bank. No bullshit.</p>
          <p className="text-base md:text-lg leading-relaxed" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>We own properties in Spain. We built the engine that finds the best ones. Now we&apos;re opening it up. 180 spots. One raise. If it works — and it will — this is Round 1 of something much bigger.</p>
          <p className="text-gray-600 text-sm tracking-[0.15em] mt-8">Coming soon.</p>
          <div className="h-px w-full mt-10" style={{ background: '#1a2332' }} />
        </div>
      </div>

      {/* ── 9 INFO BOXES ── */}
      <div className="px-4 md:px-10 pt-16 pb-12" style={{ background: '#0d1117' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
          {([
            { id: 'raise', title: 'THE RAISE', stat: '\€450,000', subtitle: 'Hard cap \u00B7 180 spots', amber: false },
            { id: 'property', title: 'THE PROPERTY', stat: '1 Villa', subtitle: 'Key-ready \u00B7 Highest scored', amber: false },
            { id: 'yield', title: 'THE YIELD', stat: '6\–8%', subtitle: 'Gross \u00B7 Paid in USDT', amber: false },
            { id: 'market', title: 'THE MARKET', stat: '8\–12%', subtitle: 'Annual appreciation \u00B7 Costa Blanca', amber: false },
            { id: 'rules', title: 'THE RULES', stat: '12 months', subtitle: 'Minimum lock \u00B7 No exceptions', amber: false },
            { id: 'numbers', title: 'THE NUMBERS', stat: '\€2,500', subtitle: 'Minimum \u00B7 0.55% ownership', amber: false },
            { id: 'token', title: 'THE TOKEN', stat: '$AVY', subtitle: 'BEP-20 \u00B7 BSC \u00B7 450,000 supply', amber: false },
            { id: 'vault', title: 'THE VAULT', stat: '2/3', subtitle: 'Signers required \u00B7 48hr timelock', amber: false },
            { id: 'risk', title: 'THE RISK', stat: '!', subtitle: 'Read this. Seriously.', amber: true },
          ] as const).map((box) => (
            <div
              key={box.id}
              onClick={() => setOpenModal(box.id)}
              className="relative rounded-lg p-5 cursor-pointer transition-all duration-200 group"
              style={{
                background: '#0d1117',
                border: '1px solid #1c2333',
                borderTop: `2px solid ${box.amber ? '#ca8a04' : '#00b9ff'}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: box.amber ? '#ca8a04' : '#00b9ff', fontVariant: 'small-caps' }}>{box.title}</h3>
              <div className="text-white text-2xl font-bold mb-1">{box.stat}</div>
              <p className="text-gray-400 text-xs">{box.subtitle}</p>
              <ChevronRight size={14} className="absolute bottom-4 right-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* ── INFO MODALS ── */}
      {openModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setOpenModal(null)}>
          <div
            className="relative rounded-lg w-full max-w-[600px] mx-4 overflow-hidden"
            style={{ background: '#0d1117', border: '1px solid #1c2333', borderTop: `4px solid ${openModal === 'risk' ? '#ca8a04' : '#00b9ff'}` }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setOpenModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-lg z-10">&times;</button>
            <div className="p-6 max-h-[80vh] overflow-y-auto">

              {openModal === 'raise' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff', fontVariant: 'small-caps' }}>THE RAISE</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p>Hard cap: <span className="text-white font-semibold">&euro;450,000 USDT</span></p>
                    <p>Minimum contribution: &euro;2,500 USDT. Maximum spots: 180. Raise window: 90 days from open. Chain: Binance Smart Chain (BSC). Currency: USDT (BEP-20).</p>
                    <p><span className="text-white font-semibold">If The Core fills:</span> Capital locks. Property acquisition begins within 30 days of raise close.</p>
                    <p><span className="text-white font-semibold">If The Core does not fill:</span> 100% of funds returned to contributors via smart contract. No fees. No deductions. No exceptions.</p>
                  </div>
                </>
              )}

              {openModal === 'property' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff', fontVariant: 'small-caps' }}>THE PROPERTY</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p>One property. The highest scored asset on the Avena engine at the moment The Core locks.</p>
                    <p className="text-white font-semibold">Selection criteria:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Key-ready only &mdash; no off-plan, no waiting</li>
                      <li>New build only</li>
                      <li>Costa Blanca or Costa C&aacute;lida</li>
                      <li>Minimum Avena Score: 65/100</li>
                      <li>Minimum estimated gross yield: 6%</li>
                    </ul>
                    <p className="text-white font-semibold">5 scoring dimensions:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Price per m&sup2; vs. market average</li>
                      <li>Estimated rental yield</li>
                      <li>Location demand &amp; occupancy data</li>
                      <li>Build quality &amp; developer track record</li>
                      <li>Resale liquidity &amp; appreciation potential</li>
                    </ul>
                    <p className="text-gray-500 text-xs mt-4">The specific property is revealed when The Core locks. Not before.</p>
                  </div>
                </>
              )}

              {openModal === 'yield' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff', fontVariant: 'small-caps' }}>THE YIELD</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p>Estimated gross yield: <span className="text-white font-semibold">6&ndash;8%</span>. Estimated net yield: <span className="text-white font-semibold">4&ndash;5.5%</span> after all costs.</p>
                    <p>Distribution: Monthly in USDT, direct to your connected wallet.</p>
                    <p>At &euro;2,500 contribution (0.55% ownership): approximately &euro;13.75/month gross.</p>
                    <p className="text-white font-semibold">Costs deducted before net distribution:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Property management: 15&ndash;20%</li>
                      <li>IBI (local property tax)</li>
                      <li>Community fees</li>
                      <li>Building insurance</li>
                      <li>Maintenance reserve</li>
                    </ul>
                    <p className="text-gray-500 text-xs mt-4">Yield is estimated, not guaranteed. Actual returns depend on occupancy, rental rates, and operating costs.</p>
                  </div>
                </>
              )}

              {openModal === 'market' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff', fontVariant: 'small-caps' }}>THE MARKET</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p>Spanish new builds in Costa Blanca have appreciated <span className="text-white font-semibold">8&ndash;12% annually</span> in recent years.</p>
                    <p>The Avena engine currently tracks <span className="text-white font-semibold">1,881 properties</span> across Costa Blanca South, Costa Blanca North, and Costa C&aacute;lida.</p>
                    <p>Costa Blanca South average gross yield: <span className="text-white font-semibold">5.5%</span>.</p>
                    <p>Key-ready properties command a premium because they generate income immediately. No construction delays. No developer risk.</p>
                    <p>Demand from Northern European buyers continues to accelerate. Supply of quality new builds remains constrained.</p>
                    <p className="mt-4"><a href="/market-index" className="text-xs hover:underline" style={{ color: '#00b9ff' }}>View the full Avena Market Index &rarr;</a></p>
                  </div>
                </>
              )}

              {openModal === 'rules' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff', fontVariant: 'small-caps' }}>THE RULES</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p>Minimum contribution: <span className="text-white font-semibold">&euro;2,500 USDT</span>. Maximum spots: <span className="text-white font-semibold">180</span>.</p>
                    <p>Lock period: <span className="text-white font-semibold">12 months minimum</span>. No early withdrawals. No exceptions.</p>
                    <p>Exit windows: Quarterly from month 12 onward. $AVY tokens are burned on redemption.</p>
                    <p>If the hard cap is not reached within 90 days: 100% refund via smart contract.</p>
                    <p>Force majeure: In the event of circumstances beyond reasonable control (regulatory changes, natural disasters, etc.), the multisig committee will determine the best course of action for all participants.</p>
                    <p className="text-amber-400 font-semibold mt-4">Do not invest money you cannot lock for 12 months. Do not invest money you cannot afford to lose. This is not a savings account.</p>
                  </div>
                </>
              )}

              {openModal === 'numbers' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff', fontVariant: 'small-caps' }}>THE NUMBERS</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p>Total raise: &euro;450,000. Allocation: <span className="text-white font-semibold">&euro;420,000</span> property + <span className="text-white font-semibold">&euro;30,000</span> reserve.</p>
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="text-left" style={{ borderBottom: '1px solid #1c2333' }}>
                            <th className="py-2 pr-4 text-gray-500 font-medium">Investment</th>
                            <th className="py-2 pr-4 text-gray-500 font-medium">Ownership</th>
                            <th className="py-2 pr-4 text-gray-500 font-medium">Monthly (est.)</th>
                            <th className="py-2 text-gray-500 font-medium">Annual (est.)</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300">
                          <tr style={{ borderBottom: '1px solid #1c233366' }}><td className="py-2 pr-4">&euro;2,500</td><td className="py-2 pr-4">0.55%</td><td className="py-2 pr-4">&euro;13.75</td><td className="py-2">&euro;165</td></tr>
                          <tr style={{ borderBottom: '1px solid #1c233366' }}><td className="py-2 pr-4">&euro;5,000</td><td className="py-2 pr-4">1.11%</td><td className="py-2 pr-4">&euro;27.50</td><td className="py-2">&euro;330</td></tr>
                          <tr style={{ borderBottom: '1px solid #1c233366' }}><td className="py-2 pr-4">&euro;10,000</td><td className="py-2 pr-4">2.22%</td><td className="py-2 pr-4">&euro;55</td><td className="py-2">&euro;660</td></tr>
                          <tr style={{ borderBottom: '1px solid #1c233366' }}><td className="py-2 pr-4">&euro;25,000</td><td className="py-2 pr-4">5.55%</td><td className="py-2 pr-4">&euro;137.50</td><td className="py-2">&euro;1,650</td></tr>
                          <tr><td className="py-2 pr-4">&euro;100,000</td><td className="py-2 pr-4">22.22%</td><td className="py-2 pr-4">&euro;550</td><td className="py-2">&euro;6,600</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">Exit value estimate: at 15% total appreciation over hold period, &euro;2,500 position would be worth approximately &euro;2,875 at redemption.</p>
                  </div>
                </>
              )}

              {openModal === 'token' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff', fontVariant: 'small-caps' }}>THE TOKEN</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p>Token: <span className="text-white font-semibold">$AVY</span>. Standard: BEP-20. Chain: Binance Smart Chain (BSC).</p>
                    <p>Total supply: <span className="text-white font-semibold">450,000 $AVY</span> (1 $AVY = 1 USDT contributed).</p>
                    <p>Non-transferable during the 12-month lock period. Tokens are burned on redemption &mdash; they do not re-enter circulation.</p>
                    <p>No team allocation. No advisor tokens. No pre-mine. 100% of supply represents contributor capital.</p>
                  </div>
                </>
              )}

              {openModal === 'vault' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff', fontVariant: 'small-caps' }}>THE VAULT</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p>Gnosis Safe multisig address:</p>
                    <div className="flex items-center gap-2 my-2">
                      <code className="text-white text-xs bg-[#090d12] px-2 py-1 rounded border border-[#1c2333] break-all">0x86D14d0d4a8B5934CC432689fB1415100d5021Cd</code>
                      <button onClick={() => navigator.clipboard.writeText('0x86D14d0d4a8B5934CC432689fB1415100d5021Cd')} className="text-gray-500 hover:text-white text-xs flex-shrink-0 transition-colors" title="Copy address">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      </button>
                    </div>
                    <p><a href="https://bscscan.com/address/0x86D14d0d4a8B5934CC432689fB1415100d5021Cd" target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: '#00b9ff' }}>View on BSCScan &rarr;</a></p>
                    <p>Signers required: <span className="text-white font-semibold">2 of 3</span>. Timelock: <span className="text-white font-semibold">48 hours</span> on all outbound movements.</p>
                    <p>All funds held in escrow until the hard cap is reached. No single person can move funds alone.</p>
                  </div>
                </>
              )}

              {openModal === 'risk' && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#ca8a04', fontVariant: 'small-caps' }}>THE RISK</h3>
                  <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                    <p className="text-amber-400 font-semibold">This is not a bank product. There is no deposit guarantee. You can lose some or all of your money.</p>
                    <p className="text-white font-semibold">Property risks:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Property values can fall as well as rise</li>
                      <li>Rental income is not guaranteed</li>
                      <li>Vacancy, damage, and maintenance costs can exceed estimates</li>
                    </ul>
                    <p className="text-white font-semibold">Crypto risks:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Smart contract bugs or exploits</li>
                      <li>USDT depeg risk</li>
                      <li>BSC network disruptions</li>
                    </ul>
                    <p className="text-white font-semibold">Regulatory risks:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Changes in Spanish property law or tax treatment</li>
                      <li>Changes in crypto regulation in your jurisdiction</li>
                    </ul>
                    <p className="text-white font-semibold">Liquidity risk:</p>
                    <p className="text-gray-400">Your capital is locked for 12 months minimum. Exit windows are quarterly after that, but redemption depends on available liquidity.</p>
                    <p className="text-white font-semibold mt-4">Who should not invest:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                      <li>Anyone who cannot afford to lose their entire contribution</li>
                      <li>Anyone who needs access to their funds within 12 months</li>
                      <li>Anyone looking for a guaranteed return</li>
                    </ul>
                    <p className="text-amber-400 text-xs mt-4 font-semibold">This is not financial advice. Do your own research. Consult a qualified financial advisor.</p>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── THE VAULT ── */}
      <div className="px-4 md:px-10 pt-12 pb-8" style={{ background: '#0d1117' }}>
        <div className="max-w-5xl mx-auto">
          <div className="rounded-lg p-6" style={{ background: '#0d1117', border: '1px solid #1a2332', borderTop: '2px solid #10B981' }}>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-5" style={{ color: '#10B981' }}>THE VAULT</h3>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-gray-500 text-xs font-medium w-32 flex-shrink-0">Multisig Address</span>
                <div className="flex items-center gap-2">
                  <code className="text-white text-xs bg-[#090d12] px-2 py-1 rounded border border-[#1a2332] break-all">0x86D14d0d4a8B5934CC432689fB1415100d5021Cd</code>
                  <button onClick={() => navigator.clipboard.writeText('0x86D14d0d4a8B5934CC432689fB1415100d5021Cd')} className="text-gray-500 hover:text-white text-xs flex-shrink-0 transition-colors" title="Copy address">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  <a href="https://bscscan.com/address/0x86D14d0d4a8B5934CC432689fB1415100d5021Cd" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white text-xs flex-shrink-0 transition-colors" title="View on BSCScan">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-gray-500 text-xs font-medium w-32 flex-shrink-0">Structure</span>
                <span className="text-gray-300 text-xs">2/3 signers required &middot; 48hr timelock on all movements</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-gray-500 text-xs font-medium w-32 flex-shrink-0">Signers</span>
                <span className="text-gray-300 text-xs">Founder &middot; Co-signer &middot; Cold storage</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-gray-500 text-xs font-medium w-32 flex-shrink-0">Transparency</span>
                <a href="https://bscscan.com/address/0x86D14d0d4a8B5934CC432689fB1415100d5021Cd" target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: '#10B981' }}>View all transactions on BSCScan &rarr;</a>
              </div>
            </div>
            <p className="text-gray-600 text-[10px] mt-5">Every euro that enters The Core is visible on-chain. No single person can move funds alone.</p>
          </div>
        </div>
      </div>

      {/* ── THE CANDIDATES ── */}
      <div className="px-4 md:px-10 py-12" style={{ background: '#0d1117' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#00b9ff' }}>THE CANDIDATES</h2>
          <p className="text-gray-400 text-sm mb-6">Key-ready properties currently eligible for Round 1. The engine selects the highest scored at raise close.</p>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none">
            {(() => {
              const candidates = properties
                .filter(p => p.pf >= 410000 && p.pf <= 440000 && p.s === 'ready' && (p.r === 'cb-south' || p.r === 'cb-north' || p.r === 'costa-calida'))
                .sort((a, b) => (b._sc ?? 0) - (a._sc ?? 0))
                .slice(0, 6);
              if (!candidates.length) return (
                <div className="flex-shrink-0 w-64 rounded-lg p-5 text-center border" style={{ background: '#090d12', borderColor: '#1c2333' }}>
                  <p className="text-gray-500 text-sm">Candidates loading — raise opens soon.</p>
                </div>
              );
              return candidates.map(p => (
                <a key={p.ref} href={`/property/${encodeURIComponent(p.ref ?? '')}`} className="flex-shrink-0 w-72 rounded-lg p-4 border hover:border-emerald-500/30 transition-all block" style={{ background: '#090d12', borderColor: '#1c2333' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-white font-semibold text-xs truncate pr-2">{p.p}</div>
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">{Math.round(p._sc ?? 0)}</span>
                  </div>
                  <div className="text-gray-500 text-[10px] mb-2">{p.l}</div>
                  <div className="text-white font-bold text-sm mb-1">&euro;{p.pf.toLocaleString()}</div>
                  {p._yield && <div className="text-emerald-400 text-[10px] font-semibold mb-2">{p._yield.gross.toFixed(1)}% gross yield</div>}
                  <div className="text-[10px] text-gray-500 hover:text-emerald-400 transition-colors">View property &rarr;</div>
                </a>
              ));
            })()}
          </div>
          <p className="text-[9px] text-gray-600 mt-3">Candidate list updates in real time as new key-ready properties are added. Final selection made by Avena engine at raise close.</p>
        </div>
      </div>

      {/* ── ROUND STATUS ── */}
      <div className="px-4 md:px-10 py-10 text-center" style={{ background: '#0d1117' }}>
        <div className="h-px w-full mb-10" style={{ background: '#1a2332' }} />
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Round 1 Status</div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-lg font-bold" style={{ color: '#00b9ff' }}>OPENING SOON</span>
        </div>
        <p className="text-gray-400 text-sm mb-2">Be first. When The Core opens — waitlist gets 24hr head start.</p>
        <div className="h-px w-full mt-10" style={{ background: '#1a2332' }} />
      </div>

      {/* ── THE REVEAL ── */}
      <div className="px-4 md:px-10 py-10" style={{ background: '#0d1117' }}>
        <div className="max-w-[800px] mx-auto rounded-lg p-6 md:p-8" style={{ background: '#090d12', border: '1px solid #1a2332', borderTop: '2px solid #00b9ff' }}>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff' }}>THE REVEAL</h3>
          <div className="text-gray-300 text-sm leading-relaxed space-y-3">
            <p>When The Core reaches €450,000 — everything stops.</p>
            <p>The Avena engine runs one final scan across all key-ready properties in Spain. The highest scored property at that exact moment wins.</p>
            <p>24 hours later — the property is revealed publicly on this page. Full address. Photos. Developer info. Avena score breakdown. Everything.</p>
            <p>From that moment — Avena has 30 days to complete the purchase.</p>
            <p className="text-white font-medium">This is not a fund picking deals behind closed doors. The algorithm decides. Publicly. Transparently. On-chain.</p>
          </div>
        </div>
      </div>

      {/* ── THE FOUNDER ── */}
      <div className="px-4 md:px-10 py-10" style={{ background: '#0d1117' }}>
        <div className="max-w-[800px] mx-auto rounded-lg p-6 md:p-8" style={{ background: '#090d12', border: '1px solid #1a2332', borderTop: '2px solid #00b9ff' }}>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#00b9ff' }}>THE FOUNDER</h3>
          <div className="text-gray-300 text-sm leading-relaxed space-y-3">
            <p>Built by Henrik — Web3 builder, licensed property agent, and investor with 3 villas in Spain.</p>
            <p>Frustrated by opaque markets, commission-hungry agents and portals that show listings but never tell you if they&apos;re actually good investments — he built the engine he wished existed.</p>
            <p>Avena Terminal started as a personal tool. The Avena Experiment is the next chapter.</p>
            <p className="text-white font-medium">Not anonymous. Not a VC. Not a fund. Just someone who knows the market better than most and wants to prove a more efficient system works.</p>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="px-4 md:px-10 py-10" style={{ background: '#0d1117' }}>
        <div className="max-w-[800px] mx-auto">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-center" style={{ color: '#00b9ff' }}>FREQUENTLY ASKED QUESTIONS</h3>
          <div className="space-y-2">
            {[
              { q: 'Is this legal?', a: 'This is a private investment round, not a public token sale. Participants self-certify as experienced investors. We are exploring ECSP licensing for future public raises. Always consult your own legal and tax advisor before investing.' },
              { q: 'What blockchain is this on?', a: 'Binance Smart Chain (BSC). Contributions are made in USDT (BEP-20). The multisig vault address is publicly visible on BSCScan.' },
              { q: 'What if the property loses value?', a: 'Property values can fall as well as rise. In the event of a significant market downturn, the multisig committee will determine the best course of action for all contributors — including holding, renting or selling the asset. This is a real estate investment, not a guaranteed return product.' },
              { q: 'How do I get my money back?', a: 'If the hard cap is not reached in 90 days — 100% of your USDT is returned automatically via smart contract. After the lock period, quarterly exit windows open where you can request redemption.' },
              { q: 'What if Avena Terminal shuts down?', a: 'The property is owned via a legal structure independent of Avena Terminal. The multisig wallet requires 2 of 3 signers — the founder cannot act alone. In a worst case scenario, the property would be sold and proceeds distributed pro-rata to all contributors.' },
              { q: 'When does Round 1 open?', a: 'Round 1 opens when the infrastructure is fully audited and legal structure is confirmed. Join the waitlist to be notified first.' },
              { q: 'What is the minimum contribution?', a: '€2,500 USDT minimum. Maximum 180 contributors. First come first served.' },
              { q: 'Do I need crypto experience?', a: 'You need a BSC-compatible wallet (MetaMask or Trust Wallet) and USDT on BSC. If you\'re not familiar with crypto wallets we recommend doing your research before participating.' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg overflow-hidden" style={{ background: '#090d12', border: '1px solid #1a2332' }}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="text-sm text-white font-medium">{item.q}</span>
                  <span className="text-gray-500 flex-shrink-0 ml-3 transition-transform duration-200" style={{ transform: faqOpen === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>&#9662;</span>
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: faqOpen === i ? '500px' : '0', opacity: faqOpen === i ? 1 : 0 }}>
                  <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── EMAIL CAPTURE ── */}
      <div className="px-4 md:px-10 py-12 text-center" style={{ background: '#0d1117' }}>
        <p className="text-gray-500 text-sm italic mb-6">Round 1 opens when The Core is ready. Get notified.</p>
        {submitted ? (
          <p className="text-sm font-semibold" style={{ color: '#10B981' }}>You&apos;re on the list.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 px-4 py-3 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors"
              style={{ background: '#090d12', border: '1px solid #1a2332' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#10B981'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#1a2332'; }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-lg text-sm font-bold border transition-all disabled:opacity-50 tracking-[0.05em]"
              style={{ borderColor: '#10B981', color: '#10B981', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.color = '#0d1117'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#10B981'; }}
            >
              {submitting ? '...' : 'Notify Me'}
            </button>
          </div>
        )}
      </div>

      {/* ── RISK MODAL ── */}
      {showRiskModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowRiskModal(false)}>
          <div className="relative rounded-2xl p-6 md:p-8 w-full max-w-md mx-4" style={{ background: '#0d1117', border: '1px solid #1c2333' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowRiskModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">&times;</button>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#F59E0B' }}>RISK DISCLAIMER</h3>
            <ul className="space-y-2 mb-6 text-sm text-gray-300">
              <li className="flex gap-2"><span className="text-yellow-500 flex-shrink-0">&bull;</span> Capital at risk — contributions may not be returned if property acquisition fails</li>
              <li className="flex gap-2"><span className="text-yellow-500 flex-shrink-0">&bull;</span> 12-month lock-up — funds cannot be withdrawn during acquisition period</li>
              <li className="flex gap-2"><span className="text-yellow-500 flex-shrink-0">&bull;</span> No guaranteed returns — yield estimates are projections only</li>
              <li className="flex gap-2"><span className="text-yellow-500 flex-shrink-0">&bull;</span> Not financial advice — this is not a regulated investment product</li>
              <li className="flex gap-2"><span className="text-yellow-500 flex-shrink-0">&bull;</span> Network risk — BSC transactions are irreversible</li>
            </ul>
            <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm text-gray-400">
              <input type="checkbox" checked={riskChecked} onChange={e => setRiskChecked(e.target.checked)} className="accent-emerald-500" />
              I have read and understood the risks
            </label>
            <button onClick={() => { setRiskAccepted(true); setShowRiskModal(false); localStorage.setItem('avena_risk_accepted', 'true'); }}
              disabled={!riskChecked} className="w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-30" style={{ background: '#10B981', color: '#0d1117' }}>
              I Understand, Continue &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}>
          <div className="relative rounded-2xl p-6 md:p-8 w-full max-w-md mx-4" style={{ background: '#0d1117', border: '1px solid #1c2333' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">&times;</button>
            <h3 className="text-lg font-bold text-emerald-400 mb-3">INTEREST REGISTERED</h3>
            <p className="text-sm text-gray-300 mb-4">Your wallet address has been recorded for <span className="text-white font-bold">{contributionAmount} USDT</span>. Round 1 is not yet open — you will be notified when The Core goes live.</p>
            <div className="rounded-lg p-3 mb-4" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
              <p className="text-[10px] text-gray-500 mb-2">Vault address (for reference only — do not send funds yet):</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-white break-all flex-1 font-mono">{VAULT_ADDRESS}</code>
                <button onClick={() => navigator.clipboard.writeText(VAULT_ADDRESS)} className="text-gray-500 hover:text-white flex-shrink-0 text-xs">Copy</button>
              </div>
            </div>
            <p className="text-xs text-yellow-500 mb-4 font-semibold">Do not send funds until Round 1 is officially open. We will confirm via email.</p>
            <button onClick={() => setShowConfirmModal(false)} className="w-full py-2.5 rounded-lg text-sm font-bold" style={{ background: '#10B981', color: '#0d1117' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
