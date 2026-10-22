/**
 * Academic email check for /api/v1/academic-access. Matches the END of the
 * email's domain on a label boundary (was a substring match, so
 * 'x@mit.edu.evil.com' or 'x@edu.com'-style tricks passed).
 */

export const ACADEMIC_DOMAINS = [
  '.edu',
  '.ac.uk',
  '.ac.jp',
  '.ac.kr',
  '.ac.za',
  '.ac.nz',
  '.ac.in',
  '.uni-',
  '.university',
  '.edu.au',
  '.edu.sg',
  '.edu.cn',
  '.edu.br',
  '.edu.mx',
  '.edu.co',
  '.edu.ar',
  '.edu.pe',
  '.ac.be',
  '.ac.at',
  '.uu.se',
  '.lu.se',
  '.ku.dk',
  '.uva.nl',
  '.ethz.ch',
  '.epfl.ch',
  '.tu-',
  '.rwth-',
  '.fu-berlin.de',
  '.hu-berlin.de',
  '.lmu.de',
  '.ox.ac.uk',
  '.cam.ac.uk',
  '.ucl.ac.uk',
  '.imperial.ac.uk',
  '.kcl.ac.uk',
  '.mit.edu',
  '.stanford.edu',
  '.harvard.edu',
  '.berkeley.edu',
  '.princeton.edu',
  '.yale.edu',
  '.columbia.edu',
  '.uchicago.edu',
  '.upenn.edu',
  '.cornell.edu',
  '.insead.edu',
  '.iese.edu',
  '.ie.edu',
  '.esade.edu',
  '.sorbonne-universite.fr',
  '.sciences-po.fr',
  '.ens.fr',
  '.polytechnique.fr',
  '.unibo.it',
  '.unimi.it',
  '.polimi.it',
];

/**
 * Prefix entries ('.uni-', '.tu-', '.rwth-') name German-speaking university
 * domains like uni-heidelberg.de or tu-wien.ac.at. They only count on those
 * country TLDs; everything else must match the END of the email's domain on a
 * label boundary.
 */
const PREFIX_TLDS = new Set(['de', 'at', 'ch']);

export function isAcademicEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at <= 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase().replace(/\.$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return false;
  const labels = domain.split('.');
  const tld = labels[labels.length - 1];
  return ACADEMIC_DOMAINS.some((entry) => {
    const e = entry.toLowerCase();
    if (e.endsWith('-')) {
      const prefix = e.replace(/^\./, '');
      return PREFIX_TLDS.has(tld) && labels.slice(0, -1).some((l) => l.startsWith(prefix) && l.length > prefix.length);
    }
    const suffix = e.startsWith('.') ? e : `.${e}`;
    const bare = suffix.slice(1);
    // 'mit.edu' itself is an institution; 'edu', 'ac.uk', 'edu.au' are
    // registries, so only their subdomains count.
    const isRegistry = !bare.includes('.') || /^(ac|edu)\./.test(bare);
    return domain.endsWith(suffix) || (!isRegistry && domain === bare);
  });
}
