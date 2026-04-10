'use client';

export default function LegalTab() {
  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-3 md:space-y-4">
      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-6">
        <h3 className="font-serif text-lg text-emerald-400 mb-3">Your Investment is Secured by Law</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          All new-build properties in Spain are protected under Spanish property law. As a buyer, your investment is secured through the <span className="text-white">Spanish Land Registry (Registro de la Propiedad)</span> — the official public record of all property ownership and encumbrances in Spain. Every transaction is registered, making ownership legally binding and publicly verifiable.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h4 className="text-emerald-300 font-semibold mb-2 text-sm">Bank Guarantee on Off-Plan Purchases</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Under Spanish Law 20/2015, developers must provide a <span className="text-white">bank guarantee or insurance policy</span> for all stage payments made before completion. If the developer fails to deliver, your deposits are 100% refunded. This is mandatory — not optional.
          </p>
        </div>
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h4 className="text-emerald-300 font-semibold mb-2 text-sm">Notary & Registration Process</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Every property purchase in Spain is completed before a <span className="text-white">licensed Spanish Notary</span> who verifies the legality of the transaction. The title deed (Escritura) is then registered in the Land Registry, giving you full legal ownership.
          </p>
        </div>
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h4 className="text-emerald-300 font-semibold mb-2 text-sm">NIE Number (Required for Foreign Buyers)</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Non-Spanish buyers need a <span className="text-white">NIE (Número de Identificación de Extranjero)</span> — a tax ID number. This is obtained at a Spanish consulate or police station in Spain. Xavia Estate assists all buyers with this process.
          </p>
        </div>
        <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-5">
          <h4 className="text-emerald-300 font-semibold mb-2 text-sm">Independent Legal Advice</h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            We recommend all buyers engage an <span className="text-white">independent Spanish lawyer (Abogado)</span> to review contracts, verify the developer&apos;s licenses, and confirm no debts exist on the property. Typical legal fees are 1% of purchase price.
          </p>
        </div>
      </div>

      <div className="bg-[#0f1419] border border-[#1c2333] rounded-lg p-6">
        <h4 className="text-emerald-300 font-semibold mb-3 text-sm">Typical Purchase Costs (Spain)</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'VAT (IVA)', value: '10%', note: 'New builds only' },
            { label: 'Stamp Duty (AJD)', value: '1.5%', note: 'On new builds' },
            { label: 'Notary & Registry', value: '~1%', note: 'Fixed cost' },
            { label: 'Legal Fees', value: '~1%', note: 'Recommended' },
          ].map(item => (
            <div key={item.label} className="bg-[#0f1419] rounded-lg p-3 text-center">
              <div className="text-emerald-400 font-bold text-lg">{item.value}</div>
              <div className="text-white text-xs font-semibold mt-0.5">{item.label}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{item.note}</div>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3">Total acquisition cost is typically <span className="text-gray-400">+13% on top of purchase price</span> for new builds in Spain. This is reflected in our investment calculator.</p>
      </div>

      <div className="bg-[#0f1419] border border-emerald-700/20 rounded-lg p-5">
        <h4 className="text-emerald-300 font-semibold mb-2 text-sm">About Avena Estate & Xavia Estate</h4>
        <p className="text-gray-400 text-xs leading-relaxed">
          Avena Estate is an independent investment analysis platform. Property listings are sourced from <span className="text-white">Xavia Estate</span>, a licensed Spanish real estate agency operating in Costa Blanca and Costa Cálida. All transactions are handled directly by Xavia Estate and their legal partners. Avena Estate does not hold client funds or act as a property agent.
        </p>
        <div className="mt-3 flex gap-4">
          <a href="https://www.xaviaestate.com" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-300 text-xs underline">Xavia Estate website →</a>
          <a href="mailto:Henrik@xaviaestate.com" className="text-emerald-500 hover:text-emerald-300 text-xs underline">Henrik@xaviaestate.com</a>
        </div>
      </div>
    </div>
  );
}
