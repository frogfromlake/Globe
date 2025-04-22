export const countryIdToIso: Record<number, string> = {
  1: "ZW", // Zimbabwe
  2: "ZM", // Zambia
  3: "YE", // Yemen
  4: "VN", // Vietnam
  5: "VE", // Venezuela
  6: "VA", // Vatican
  7: "VU", // Vanuatu
  8: "UZ", // Uzbekistan
  9: "UY", // Uruguay
  10: "FM", // Federated States of Micronesia
  11: "MH", // Marshall Islands
  12: "MP", // Northern Mariana Islands
  13: "VI", // United States Virgin Islands
  14: "GU", // Guam
  15: "AS", // American Samoa
  16: "PR", // Puerto Rico
  17: "US", // United States of America
  18: "GS", // South Georgia and the Islands
  19: "IO", // British Indian Ocean Territory
  20: "SH", // Saint Helena
  21: "PN", // Pitcairn Islands
  22: "AI", // Anguilla
  23: "FK", // Falkland Islands
  24: "KY", // Cayman Islands
  25: "BM", // Bermuda
  26: "VG", // British Virgin Islands
  27: "TC", // Turks and Caicos Islands
  28: "MS", // Montserrat
  29: "JE", // Jersey
  30: "GG", // Guernsey
  31: "IM", // Isle of Man
  32: "GB", // United Kingdom
  33: "AE", // United Arab Emirates
  34: "UA", // Ukraine
  35: "UG", // Uganda
  36: "TM", // Turkmenistan
  37: "TR", // Turkey
  38: "TN", // Tunisia
  39: "TT", // Trinidad and Tobago
  40: "TO", // Tonga
  41: "TG", // Togo
  42: "TL", // East Timor
  43: "TH", // Thailand
  44: "TZ", // United Republic of Tanzania
  45: "TJ", // Tajikistan
  46: "TW", // Taiwan
  47: "SY", // Syria
  48: "CH", // Switzerland
  49: "SE", // Sweden
  50: "SZ", // eSwatini
  51: "SR", // Suriname
  52: "SS", // South Sudan
  53: "SD", // Sudan
  54: "LK", // Sri Lanka
  55: "ES", // Spain
  56: "KR", // South Korea
  57: "ZA", // South Africa
  58: "SO", // Somalia
  59: "SO", // Somaliland
  60: "SB", // Solomon Islands
  61: "SK", // Slovakia
  62: "SI", // Slovenia
  63: "SG", // Singapore
  64: "SL", // Sierra Leone
  65: "SC", // Seychelles
  66: "RS", // Republic of Serbia
  67: "SN", // Senegal
  68: "SA", // Saudi Arabia
  69: "ST", // São Tomé and Principe
  70: "SM", // San Marino
  71: "WS", // Samoa
  72: "VC", // Saint Vincent and the Grenadines
  73: "LC", // Saint Lucia
  74: "KN", // Saint Kitts and Nevis
  75: "RW", // Rwanda
  76: "RU", // Russia
  77: "RO", // Romania
  78: "QA", // Qatar
  79: "PT", // Portugal
  80: "PL", // Poland
  81: "PH", // Philippines
  82: "PE", // Peru
  83: "PY", // Paraguay
  84: "PG", // Papua New Guinea
  85: "PA", // Panama
  86: "PW", // Palau
  87: "PK", // Pakistan
  88: "OM", // Oman
  89: "NO", // Norway
  90: "KP", // North Korea
  91: "NG", // Nigeria
  92: "NE", // Niger
  93: "NI", // Nicaragua
  94: "NZ", // New Zealand
  95: "NU", // Niue
  96: "CK", // Cook Islands
  97: "NL", // Netherlands
  98: "AW", // Aruba
  99: "CW", // Curaçao
  100: "NP", // Nepal
  101: "NR", // Nauru
  102: "NA", // Namibia
  103: "MZ", // Mozambique
  104: "MA", // Morocco
  105: "EH", // Western Sahara
  106: "ME", // Montenegro
  107: "MN", // Mongolia
  108: "MD", // Moldova
  109: "MC", // Monaco
  110: "MX", // Mexico
  111: "MU", // Mauritius
  112: "MR", // Mauritania
  113: "MT", // Malta
  114: "ML", // Mali
  115: "MV", // Maldives
  116: "MY", // Malaysia
  117: "MW", // Malawi
  118: "MG", // Madagascar
  119: "MK", // North Macedonia
  120: "LU", // Luxembourg
  121: "LT", // Lithuania
  122: "LI", // Liechtenstein
  123: "LY", // Libya
  124: "LR", // Liberia
  125: "LS", // Lesotho
  126: "LB", // Lebanon
  127: "LV", // Latvia
  128: "LA", // Laos
  129: "KG", // Kyrgyzstan
  130: "KW", // Kuwait
  131: "XK", // Kosovo
  132: "KI", // Kiribati
  133: "KE", // Kenya
  134: "KZ", // Kazakhstan
  135: "JO", // Jordan
  136: "JP", // Japan
  137: "JM", // Jamaica
  138: "IT", // Italy
  139: "IL", // Israel
  140: "PS", // Palestine
  141: "IE", // Ireland
  142: "IQ", // Iraq
  143: "IR", // Iran
  144: "ID", // Indonesia
  145: "IN", // India
  146: "IS", // Iceland
  147: "HU", // Hungary
  148: "HN", // Honduras
  149: "HT", // Haiti
  150: "GY", // Guyana
  151: "GW", // Guinea-Bissau
  152: "GN", // Guinea
  153: "GT", // Guatemala
  154: "GD", // Grenada
  155: "GR", // Greece
  156: "GH", // Ghana
  157: "DE", // Germany
  158: "GE", // Georgia
  159: "GM", // Gambia
  160: "GA", // Gabon
  161: "FR", // France
  162: "PM", // Saint Pierre and Miquelon
  163: "WF", // Wallis and Futuna
  164: "MF", // Saint Martin
  165: "BL", // Saint Barthelemy
  166: "PF", // French Polynesia
  167: "NC", // New Caledonia
  168: "TF", // French Southern and Antarctic Lands
  169: "AX", // Aland
  170: "FI", // Finland
  171: "FJ", // Fiji
  172: "ET", // Ethiopia
  173: "EE", // Estonia
  174: "ER", // Eritrea
  175: "GQ", // Equatorial Guinea
  176: "SV", // El Salvador
  177: "EG", // Egypt
  178: "EC", // Ecuador
  179: "DO", // Dominican Republic
  180: "DM", // Dominica
  181: "DJ", // Djibouti
  182: "GL", // Greenland
  183: "FO", // Faroe Islands
  184: "DK", // Denmark
  185: "CZ", // Czechia
  186: "CY", // Northern Cyprus
  187: "CY", // Cyprus
  188: "CU", // Cuba
  189: "HR", // Croatia
  190: "CI", // Ivory Coast
  191: "CR", // Costa Rica
  192: "CD", // Democratic Republic of the Congo
  193: "CG", // Republic of the Congo
  194: "KM", // Comoros
  195: "CO", // Colombia
  196: "CN", // China
  197: "MO", // Macao S.A.R
  198: "HK", // Hong Kong S.A.R.
  199: "CL", // Chile
  200: "TD", // Chad
  201: "CF", // Central African Republic
  202: "CV", // Cabo Verde
  203: "CA", // Canada
  204: "CM", // Cameroon
  205: "KH", // Cambodia
  206: "MM", // Myanmar
  207: "BI", // Burundi
  208: "BF", // Burkina Faso
  209: "BG", // Bulgaria
  210: "BN", // Brunei
  211: "BR", // Brazil
  212: "BW", // Botswana
  213: "BA", // Bosnia and Herzegovina
  214: "BO", // Bolivia
  215: "BT", // Bhutan
  216: "BJ", // Benin
  217: "BZ", // Belize
  218: "BE", // Belgium
  219: "BY", // Belarus
  220: "BB", // Barbados
  221: "BD", // Bangladesh
  222: "BH", // Bahrain
  223: "BS", // The Bahamas
  224: "AZ", // Azerbaijan
  225: "AT", // Austria
  226: "AU", // Australia
  227: "IO", // Indian Ocean Territories
  228: "HM", // Heard Island and McDonald Islands
  229: "NF", // Norfolk Island
  230: "AU", // Ashmore and Cartier Islands
  231: "AM", // Armenia
  232: "AR", // Argentina
  233: "AG", // Antigua and Barbuda
  234: "AO", // Angola
  235: "AD", // Andorra
  236: "DZ", // Algeria
  237: "AL", // Albania
  238: "AF", // Afghanistan
  239: "IN", // Siachen Glacier
  240: "AQ", // Antarctica
  241: "SX", // Sint Maarten
  242: "TV", // Tuvalu
};
