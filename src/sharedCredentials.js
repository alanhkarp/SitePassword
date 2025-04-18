// from https://github.com/apple/password-manager-resources/blob/main/quirks/shared-credentials.json
export function isSharedCredentials(domain1, domain2) {
    if (!domain1 || !domain2) return false;    
    return sharedCredentials.some(entry => 
        entry.shared && 
        entry.shared.some(sharedDomain => domain1.endsWith(sharedDomain)) && 
        entry.shared.some(sharedDomain => domain2.endsWith(sharedDomain))
    );
}
function getSharedCredentials(domain, obsoleted, from, to, fromDomainsAreObsoleted) {
    if (!domain) return [];
    if (!obsoleted) return getSharedCredentials(domain);
    if (!from) return getSharedCredentialsForDomainAndObsoleted(domain, obsoleted);
    if (!to) return getSharedCredentialsForDomainAndObsoletedAndFrom(domain, obsoleted, from);
    if (!fromDomainsAreObsoleted) return getSharedCredentialsForDomainAndObsoletedAndFromAndTo(domain, obsoleted, from, to);
    return getSharedCredentialsForDomainAndObsoletedAndFromAndToAndFromDomainsAreObsoleted(domain, obsoleted, from, to, fromDomainsAreObsoleted);
}
function getSharedCredentialsForDomain(domain) {
    let result = [];
    sharedCredentials.forEach((entry) => {
        if (entry.shared && entry.shared.some(sharedDomain => domain.endsWith(sharedDomain))) {
            result.push(entry);
        }
    });
    return result;
}
function getSharedCredentialsForDomainAndObsoleted(domain, obsoleted) {
    let result = [];
    sharedCredentials.forEach((entry) => {
        if (entry.shared && entry.shared.some(sharedDomain => domain.endsWith(sharedDomain)) && entry.obsoleted === obsoleted) {
            result.push(entry);
        }
    });
    return result;
}
function getSharedCredentialsForDomainAndObsoletedAndFrom(domain, obsoleted, from) {
    let result = [];
    sharedCredentials.forEach((entry) => {
        if (entry.shared && entry.shared.some(sharedDomain => domain.endsWith(sharedDomain)) 
            && entry.obsoleted === obsoleted 
            && entry.from && entry.from.includes(from)) {
            result.push(entry);
        }
    });
    return result;
}
function getSharedCredentialsForDomainAndObsoletedAndFromAndTo(domain, obsoleted, from, to) {
    let result = [];
    sharedCredentials.forEach((entry) => {
        if ((entry.shared && entry.shared.some(sharedDomain => domain.endsWith(sharedDomain)) || entry.from && entry.from.includes(domain) || entry.to && entry.to.includes(domain)) 
            && entry.obsoleted === obsoleted 
            && entry.from && entry.from.includes(from) 
            && entry.to && entry.to.includes(to)) {
            result.push(entry);
        }
    });
    return result;
}
function getSharedCredentialsForDomainAndObsoletedAndFromAndToAndFromDomainsAreObsoleted(domain, obsoleted, from, to, fromDomainsAreObsoleted) {
    let result = [];
    sharedCredentials.forEach((entry) => {
        if ((entry.shared && entry.shared.some(sharedDomain => domain.endsWith(sharedDomain)) || entry.from && entry.from.includes(domain) || entry.to && entry.to.includes(domain)) 
            && entry.obsoleted === obsoleted 
            && entry.from && entry.from.includes(from) 
            && entry.to && entry.to.includes(to) 
            && entry.fromDomainsAreObsoleted === fromDomainsAreObsoleted) {
            result.push(entry);
        }
    });
    return result;
}
// From https://github.com/apple/password-manager-resources/blob/main/CONTRIBUTING.md
// Each entry in quirks/shared-credentials.json and quirks/shared-credentials-historical.json is an object with the following valid sets of keys:
// from, to, and fromDomainsAreObsoleted (fromDomainsAreObsoleted is optional) shared
// from is an array of domains whose credentials should be shared one-way. This array cannot be empty.
// to is an array of target domains that any credentials associated with the from domains should be allowed to match. This array cannot be empty.
// fromDomainsAreObsoleted is a boolean that indicates whether or not the from domains in an entry have been obsoleted by the to domains (meaning logins are no longer served on the from domains). 
//     In the case of a redirect (such as discordapp.com -> discord.com), this would be true. Omission of the property means that it is false.
// shared is an array of domains whose credentials are all shared. This array cannot be empty.
// When contributing or amending a set of websites sharing a credential backend, you should state why you believe the relevant domains do or do not share a credential backend, with evidence to support your claim. This may involve WHOIS information or content served from the domains themselves.
let sharedCredentials = [
    {
        "shared": [
            "3docean.net",
            "audiojungle.net",
            "codecanyon.net",
            "envato.com",
            "graphicriver.net",
            "photodune.net",
            "placeit.net",
            "themeforest.net",
            "tutsplus.com",
            "videohive.net"
        ]
    },
    {
        "shared": [
            "airbnb.com.ar",
            "airbnb.com.au",
            "airbnb.at",
            "airbnb.be",
            "airbnb.com.bz",
            "airbnb.com.bo",
            "airbnb.com.br",
            "airbnb.ca",
            "airbnb.cl",
            "airbnb.com.co",
            "airbnb.co.cr",
            "airbnb.cz",
            "airbnb.dk",
            "airbnb.com.ec",
            "airbnb.com.sv",
            "airbnb.fi",
            "airbnb.fr",
            "airbnb.de",
            "airbnb.gr",
            "airbnb.com.gt",
            "airbnb.gy",
            "airbnb.com.hn",
            "airbnb.com.hk",
            "airbnb.hu",
            "airbnb.is",
            "airbnb.co.in",
            "airbnb.co.id",
            "airbnb.ie",
            "airbnb.it",
            "airbnb.jp",
            "airbnb.com.my",
            "airbnb.com.mt",
            "airbnb.mx",
            "airbnb.nl",
            "airbnb.co.nz",
            "airbnb.com.ni",
            "airbnb.no",
            "airbnb.com.pa",
            "airbnb.com.py",
            "airbnb.com.pe",
            "airbnb.pl",
            "airbnb.pt",
            "airbnb.ru",
            "airbnb.com.sg",
            "airbnb.co.kr",
            "airbnb.es",
            "airbnb.se",
            "airbnb.ch",
            "airbnb.com.tw",
            "airbnb.com.tr",
            "airbnb.co.uk",
            "airbnb.com",
            "airbnb.co.ve"
        ]
    },
    {
        "shared": [
            "airnewzealand.co.nz",
            "airnewzealand.com",
            "airnewzealand.com.au"
        ]
    },
    {
        "shared": [
            "albertsons.com",
            "acmemarkets.com",
            "carrsqc.com",
            "jewelosco.com",
            "pavilions.com",
            "randalls.com",
            "safeway.com",
            "shaws.com",
            "starmarket.com",
            "tomthumb.com",
            "vons.com"
        ]
    },
    {
        "shared": [
            "alelo.com.br",
            "meualelo.com.br"
        ]
    },
    {
        "shared": [
            "ana.co.jp",
            "astyle.jp"
        ]
    },
    {
        "from": [
            "angel.co"
        ],
        "to": [
            "wellfound.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "anthem.com",
            "sydneyhealth.com"
        ]
    },
    {
        "from": [
            "appannie.com"
        ],
        "to": [
            "data.ai"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "bgg.cc",
            "boardgamegeek.com",
            "rpggeek.com",
            "videogamegeek.com"
        ]
    },
    {
        "shared": [
            "candyrect.com",
            "nekochat.cn"
        ]
    },
    {
        "shared": [
            "centralfcu.org",
            "centralfcu.com"
        ]
    },
    {
        "shared": [
            "coolblue.nl",
            "coolblue.be",
            "coolblue.de"
        ]
    },
    {
        "shared": [
            "dan.org",
            "diversalertnetwork.org"
        ]
    },
    {
        "from": [
            "digiromania.ro",
            "rcs-rds.ro"
        ],
        "to": [
            "digi.ro"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "discordapp.com"
        ],
        "to": [
            "discord.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "discordmerch.com",
            "discord.store"
        ]
    },
    {
        "from": [
            "discovercard.com"
        ],
        "to": [
            "discover.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "disney.com",
            "disneyplus.com",
            "disneystore.com",
            "espn.com",
            "go.com",
            "hulu.com",
            "shopdisney.com"
        ]
    },
    {
        "shared": [
            "dnt.abine.com",
            "ironvest.com"
        ]
    },
    {
        "shared": [
            "drivethrucards.com",
            "drivethrucomics.com",
            "drivethrufiction.com",
            "drivethrurpg.com",
            "dmsguild.com",
            "pathfinderinfinite.com",
            "storytellersvault.com",
            "wargamevault.com"
        ]
    },
    {
        "shared": [
            "ebay.at",
            "ebay.be",
            "ebay.ca",
            "ebay.ch",
            "ebay.cn",
            "ebay.co.th",
            "ebay.co.uk",
            "ebay.com",
            "ebay.com.au",
            "ebay.com.hk",
            "ebay.com.my",
            "ebay.com.sg",
            "ebay.com.tw",
            "ebay.de",
            "ebay.es",
            "ebay.fr",
            "ebay.ie",
            "ebay.it",
            "ebay.nl",
            "ebay.ph",
            "ebay.pl",
            "ebay.vn"
        ]
    },
    {
        "shared": [
            "epicgames.com",
            "fortnite.com",
            "twinmotion.com",
            "unrealengine.com"
        ]
    },
    {
        "shared": [
            "eventbrite.at",
            "eventbrite.be",
            "eventbrite.ca",
            "eventbrite.ch",
            "eventbrite.cl",
            "eventbrite.co",
            "eventbrite.com",
            "eventbrite.de",
            "eventbrite.dk",
            "eventbrite.es",
            "eventbrite.fi",
            "eventbrite.fr",
            "eventbrite.hk",
            "eventbrite.ie",
            "eventbrite.in",
            "eventbrite.it",
            "eventbrite.my",
            "eventbrite.nl",
            "eventbrite.ph",
            "eventbrite.pt",
            "eventbrite.se",
            "eventbrite.sg"
        ]
    },
    {
        "from": [
            "fancourier.ro"
        ],
        "to": [
            "selfawb.ro"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "flyblade.com"
        ],
        "to": [
            "blade.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "gazduire.com.ro",
            "gazduire.net"
        ],
        "to": [
            "admin.ro"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "hbo.com",
            "hbomax.com",
            "hbonow.com"
        ],
        "to": [
            "max.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "heroku.com"
        ],
        "to": [
            "verify.salesforce.com"
        ]
    },
    {
        "from": [
            "ing.de"
        ],
        "to": [
            "ing.com"
        ]
    },
    {
        "shared": [
            "instagram.com",
            "threads.net"
        ]
    },
    {
        "from": [
            "keypointcu.com"
        ],
        "to": [
            "kpcu.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "letsdeel.com"
        ],
        "to": [
            "deel.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "login.airfrance.com",
            "login.flyingblue.com",
            "login.klm.com"
        ]
    },
    {
        "shared": [
            "lrz.de",
            "mwn.de",
            "mytum.de",
            "tum.de",
            "tum.edu"
        ]
    },
    {
        "from": [
            "mercadolibre.cl",
            "mercadolibre.co.cr",
            "mercadolibre.com.ar",
            "mercadolibre.com.bo",
            "mercadolibre.com.co",
            "mercadolibre.com.do",
            "mercadolibre.com.ec",
            "mercadolibre.com.gt",
            "mercadolibre.com.hn",
            "mercadolibre.com.mx",
            "mercadolibre.com.ni",
            "mercadolibre.com.pa",
            "mercadolibre.com.pe",
            "mercadolibre.com.py",
            "mercadolibre.com.sv",
            "mercadolibre.com.uy",
            "mercadolibre.com.ve",
            "mercadopago.cl",
            "mercadopago.com.ar",
            "mercadopago.com.co",
            "mercadopago.com.ec",
            "mercadopago.com.mx",
            "mercadopago.com.pe",
            "mercadopago.com.uy",
            "mercadopago.com.ve"
        ],
        "to": [
            "mercadolibre.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "mercadolivre.com.br",
            "mercadopago.com.br"
        ],
        "to": [
            "mercadolivre.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "moneybird.nl",
            "moneybird.de"
        ],
        "to": [
            "moneybird.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "nebula.app",
            "watchnebula.com"
        ],
        "to": [
            "nebula.tv"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "nextinpact.com"
        ],
        "to": [
            "next.ink"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "nordvpn.com",
            "nordpass.com"
        ],
        "to": [
            "nordaccount.com"
        ]
    },
    {
        "from": [
            "overstock.com"
        ],
        "to": [
            "bedbathandbeyond.com"
        ]
    },
    {
        "from": [
            "parkmobile.us"
        ],
        "to": [
            "parkmobile.io"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "pinterest.com",
            "pinterest.ca",
            "pinterest.co.uk",
            "pinterest.fr",
            "pinterest.de",
            "pinterest.es",
            "pinterest.com.au",
            "pinterest.se",
            "pinterest.ph",
            "pinterest.ch",
            "pinterest.com.mx",
            "pinterest.dk",
            "pinterest.pt",
            "pinterest.ru",
            "pinterest.it",
            "pinterest.at",
            "pinterest.jp",
            "pinterest.cl",
            "pinterest.ie",
            "pinterest.co.kr",
            "pinterest.nz"
        ]
    },
    {
        "shared": [
            "postnl.nl",
            "postnl.be"
        ]
    },
    {
        "shared": [
            "pretendo.network",
            "pretendo.cc"
        ]
    },
    {
        "shared": [
            "proton.me",
            "protonvpn.com",
            "protonmail.ch",
            "protonmail.com"
        ]
    },
    {
        "shared": [
            "quicken.com",
            "simplifimoney.com"
        ]
    },
    {
        "from": [
            "raywenderlich.com"
        ],
        "to": [
            "kodeco.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "redis.com",
            "redislabs.com"
        ]
    },
    {
        "shared": [
            "rekordbox.com",
            "pioneerdj.com",
            "community.pioneerdj.com"
        ]
    },
    {
        "shared": [
            "s.activision.com",
            "profile.callofduty.com"
        ]
    },
    {
        "from": [
            "scottscheapflights.com"
        ],
        "to": [
            "going.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "steampowered.com",
            "steamcommunity.com",
            "steamgames.com"
        ]
    },
    {
        "shared": [
            "taxhawk.com",
            "freetaxusa.com",
            "express1040.com"
        ]
    },
    {
        "from": [
            "telegram.me"
        ],
        "to": [
            "telegram.org"
        ],
        "fromDomainsAreObsoleted": false
    },
    {
        "shared": [
            "ting.com",
            "tingmobile.com"
        ]
    },
    {
        "from": [
            "transferwise.com"
        ],
        "to": [
            "wise.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "tvnow.de",
            "tvnow.at",
            "tvnow.ch"
        ],
        "to": [
            "auth.rtl.de",
            "rtlplus.de",
            "rtlplus.com"
        ],
        "fromDomainsAreObsoleted": false
    },
    {
        "from": [
            "twitter.com"
        ],
        "to": [
            "x.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "uspowerboating.com",
            "ussailing.org"
        ]
    },
    {
        "from": [
            "wacom.eu"
        ],
        "to": [
            "wacom.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "shared": [
            "wikipedia.org",
            "mediawiki.org",
            "wikibooks.org",
            "wikidata.org",
            "wikinews.org",
            "wikiquote.org",
            "wikisource.org",
            "wikiversity.org",
            "wikivoyage.org",
            "wiktionary.org",
            "commons.wikimedia.org",
            "meta.wikimedia.org",
            "incubator.wikimedia.org",
            "outreach.wikimedia.org",
            "species.wikimedia.org",
            "wikimania.wikimedia.org",
            "auth.wikimedia.org"
        ]
    },
    {
        "from": [
            "www.seek.com.au",
            "www.seek.co.nz",
            "jobsdb.com",
            "hk.jobsdb.com",
            "sg.jobsdb.com",
            "th.jobsdb.com",
            "jobstreet.com",
            "myjobstreet.jobstreet.co.id",
            "myjobstreet.jobstreet.com.my",
            "myjobstreet.jobstreet.com.ph",
            "myjobstreet.jobstreet.com.sg"
        ],
        "to": [
            "login.seek.com"
        ]
    },
    {
        "from": [
            "www.vistaprint.ca"
        ],
        "to": [
            "account.vistaprint.com"
        ],
        "fromDomainsAreObsoleted": true
    },
    {
        "from": [
            "youneedabudget.com"
        ],
        "to": [
            "ynab.com"
        ],
        "fromDomainsAreObsoleted": true
    }
]