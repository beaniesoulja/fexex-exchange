const countryCallingCodes: Record<string, string> = {
  AE: "+971", AR: "+54", AT: "+43", AU: "+61", BD: "+880", BE: "+32", BR: "+55", CA: "+1", CH: "+41", CI: "+225", CM: "+237", CN: "+86", CO: "+57", DE: "+49", DK: "+45", DZ: "+213", EG: "+20", ES: "+34", ET: "+251", FI: "+358", FR: "+33", GB: "+44", GH: "+233", ID: "+62", IE: "+353", IN: "+91", IT: "+39", JP: "+81", KE: "+254", KR: "+82", MA: "+212", MX: "+52", MY: "+60", NG: "+234", NL: "+31", NO: "+47", NZ: "+64", PH: "+63", PK: "+92", PL: "+48", PT: "+351", RU: "+7", RW: "+250", SA: "+966", SE: "+46", SG: "+65", SN: "+221", TH: "+66", TR: "+90", TZ: "+255", UA: "+380", UG: "+256", US: "+1", VN: "+84", ZA: "+27",
};

export function getCountryCallingCode(country: string | null) {
  return countryCallingCodes[country?.trim().toUpperCase() ?? ""] ?? "+234";
}
