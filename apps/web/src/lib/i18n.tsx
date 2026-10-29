import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Language = 'en' | 'fil'
const LanguageContext = createContext<{ language: Language; setLanguage: (value: Language) => void }>({
  language: 'en',
  setLanguage: () => {},
})

const filipino: Record<string, string> = {
  pending: 'Naghihintay ng pasiya',
  confirmed: 'Kumpirmado',
  rejected: 'Hindi kinumpirma',
  'Please wait…': 'Maghintay sandali…',
  'The photo could not be loaded. Close and reopen the report to try again.':
    'Hindi maipakita ang larawan. Isara at buksan muli ang ulat upang subukan ulit.',
  'Invalid credentials': 'Hindi tama ang email o password.',
  'Email already registered': 'Nakarehistro na ang email na ito.',
  'Authentication required': 'Mag-sign in muna upang magpatuloy.',
  'Insufficient role': 'Wala kang pahintulot sa aksiyong ito.',
  'Invalid CSRF token': 'Nag-expire ang sesyon. I-refresh ang pahina at mag-sign in muli.',
  'Too many requests': 'Masyadong maraming pagsubok. Maghintay sandali bago ulitin.',
  'Image too large': 'Masyadong malaki ang larawan. Pumili ng larawang hindi lalampas sa 5 MB.',
  'Request body too large': 'Masyadong malaki ang ipinapasang datos. Pumili ng mas maliit na larawan.',
  'Unsupported image': 'Hindi suportado ang larawan. Pumili ng JPG, PNG, o WebP.',
  'Invalid image': 'Hindi mabasa ang larawan. Pumili ng ibang JPG, PNG, o WebP.',
  'Report not found': 'Hindi makita ang ulat o wala kang pahintulot na tingnan ito.',
  'Image not found': 'Hindi makita ang larawan.',
  'Invalid location or category': 'Suriin ang lokasyon at kategorya ng insidente.',
  'Invalid status transition': 'Hindi pinapayagan ang pagbabagong ito ng estado. I-refresh ang ulat.',
  'Verified category required': 'Pumili ng beripikadong kategorya.',
  'Verified category only allowed on acceptance': 'Itakda ang beripikadong kategorya sa pagtanggap ng ulat.',
  'Report changed; refresh and retry': 'Nabago na ang ulat. I-refresh at subukan muli.',
  'Invalid action kind': 'Hindi wastong uri ng aksiyon.',
  'Invalid decision': 'Hindi wastong pasiya.',
  'Suggestion not found': 'Hindi makita ang mungkahi.',
  'Suggestion already decided': 'May pasiya na sa mungkahing ito. I-refresh ang ulat.',
  'Notification not found': 'Hindi makita ang abiso.',
  'Unsupported language': 'Hindi suportado ang wikang ito.',
  'Private image storage unavailable. Please try again.': 'Hindi magamit ang imbakan ng larawan. Subukan muli.',
  'Incident photo storage must be private':
    'May problema sa pribadong imbakan ng larawan. Ipaalam ito sa tagapangasiwa.',
  'Invalid stored image reference': 'Hindi mabasa ang tala ng larawan. Ipaalam ito sa tagapangasiwa.',
  'Failed to fetch': 'Hindi makakonekta. Suriin ang internet at subukan muli.',
  'NetworkError when attempting to fetch resource.': 'Hindi makakonekta. Suriin ang internet at subukan muli.',

  'Continue with Google': 'Magpatuloy gamit ang Google',
  'Google sign-in was cancelled. Try again or use your password.':
    'Kinansela ang Google sign-in. Subukan muli o gamitin ang password.',
  'Google sign-in expired. Please try again.': 'Nag-expire ang Google sign-in. Subukan muli.',
  'Google sign-in is unavailable right now. Try again or use your password.':
    'Hindi magamit ang Google sign-in ngayon. Subukan muli o gamitin ang password.',
  'Use a verified Google email address to sign in.': 'Gumamit ng beripikadong Google email address.',
  'This email already has an account. Sign in with your password.':
    'May account na ang email na ito. Mag-sign in gamit ang password.',
  'Google sign-in is available for resident accounts only.': 'Para lamang sa account ng residente ang Google sign-in.',

  'Choose photo': 'Pumili ng larawan',
  'Take photo': 'Kumuha ng larawan',
  'Incident photo · Choose photo': 'Larawan ng insidente · Pumili ng larawan',
  'Selected photo:': 'Napiling larawan:',
  'JPG, PNG, or WebP, up to 5 MB. Avoid faces and license plates.':
    'JPG, PNG, o WebP, hanggang 5 MB. Iwasan ang mukha at plaka ng sasakyan.',
  'HEIC photos are not supported. Choose JPG, PNG, or WebP, or take a new photo.':
    'Hindi suportado ang HEIC. Pumili ng JPG, PNG, o WebP, o kumuha ng bagong larawan.',
  'Choose a JPG, PNG, or WebP photo.': 'Pumili ng larawang JPG, PNG, o WebP.',
  'Photo is too large. Choose a photo of 5 MB or less.':
    'Masyadong malaki ang larawan. Pumili ng larawang hindi lalampas sa 5 MB.',

  'Share what you see, pin where it happened, and follow every report from submission to resolution.':
    'Ibahagi ang nakita mo, ituro ang lokasyon, at subaybayan ang ulat hanggang malutas.',
  'Photo guided reports': 'Ulat na may larawan',
  'Precise locations': 'Tumpak na lokasyon',
  'Welcome back': 'Maligayang pagbabalik',
  'Create an account': 'Gumawa ng account',
  'Sign in to track concerns in your community.': 'Mag-sign in upang subaybayan ang mga ulat sa inyong komunidad.',
  'Join your barangay reporting channel.': 'Sumali sa sistema ng pag-uulat ng inyong barangay.',
  'Email address': 'Email address',
  Password: 'Password',
  'Sign in': 'Mag-sign in',
  'Create account': 'Gumawa ng account',
  'New here? Create an account': 'Bago rito? Gumawa ng account',
  'Already registered? Sign in': 'May account na? Mag-sign in',
  'Sign out': 'Mag-sign out',
  'Barangay desk': 'Tanggapan ng barangay',
  'Make a report': 'Gumawa ng ulat',
  'Incident photo': 'Larawan ng insidente',
  'AI classification unavailable': 'Hindi magagamit ang AI classification',
  'AI is uncertain': 'Hindi tiyak ang AI',
  'Choose the category yourself. Barangay personnel will verify it.':
    'Piliin ang kategorya. Beripikahin ito ng barangay.',
  'Incident category': 'Kategorya ng insidente',
  'Description (optional)': 'Paglalarawan (opsiyonal)',
  'Use GPS, move a map pin, or enter coordinates.': 'Gumamit ng GPS, ilipat ang pin sa mapa, o ilagay ang coordinates.',
  'Use GPS': 'Gamitin ang GPS',
  'Adjust pin on map': 'Ilipat ang pin sa mapa',
  'Hide map': 'Itago ang mapa',
  Latitude: 'Latitude',
  Longitude: 'Longitude',
  'Submit report': 'Ipasa ang ulat',
  'Submitting…': 'Ipinapasa…',
  'Report submitted. Barangay personnel will review it.': 'Naipasa ang ulat. Susuriin ito ng barangay.',
  'My reports': 'Mga ulat ko',
  'No reports yet': 'Wala pang ulat',
  'New resident reports will appear here.': 'Dito lalabas ang mga bagong ulat ng residente.',
  'Submitted concerns and updates will appear here.': 'Dito lalabas ang mga naipasang ulat at update.',
  'Review report': 'Suriin ang ulat',
  'View report': 'Tingnan ang ulat',
  'Ask BarangAI': 'Magtanong sa BarangAI',
  'Get reporting guidance in English, Filipino, or Taglish.': 'Humingi ng gabay sa English, Filipino, o Taglish.',
  'Report to track (optional)': 'Ulat na susubaybayan (opsiyonal)',
  'General guidance': 'Pangkalahatang gabay',
  Language: 'Wika',
  Message: 'Mensahe',
  Send: 'Ipadala',
  'Resident category': 'Kategorya ng residente',
  'AI suggestion': 'Mungkahi ng AI',
  'Verified category': 'Beripikadong kategorya',
  'Status history': 'Kasaysayan ng estado',
  'Action log': 'Tala ng aksiyon',
  'Change status': 'Baguhin ang estado',
  'Status note (optional)': 'Tala sa estado (opsiyonal)',
  'Document work': 'Itala ang ginawa',
  'Record type': 'Uri ng tala',
  'Staff action': 'Aksiyon ng kawani',
  'External coordination': 'Pakikipag-ugnayan sa labas',
  Note: 'Tala',
  'Save action': 'I-save ang aksiyon',
  'Potential duplicates': 'Mga posibleng dobleng ulat',
  'Duplicate suggestions unavailable. Review nearby reports manually until a validated image embedding model is connected.':
    'Walang mungkahi sa dobleng ulat. Manu-manong suriin ang malalapit na ulat hanggang may beripikadong modelo.',
  'Suggestions need a staff decision. Original submissions remain separate.':
    'Kailangan ng pasiya ng kawani. Mananatiling hiwalay ang mga orihinal na ulat.',
  'Check for suggestions': 'Suriin ang mga mungkahi',
  'No suggestions found.': 'Walang nakitang mungkahi.',
  'Decision note (optional)': 'Tala sa pasiya (opsiyonal)',
  'Confirm same incident': 'Kumpirmahing iisang insidente',
  'Not duplicate': 'Hindi doble',
  'Loading duplicate review…': 'Kinukuha ang mga mungkahi…',
  'Operations overview': 'Buod ng operasyon',
  'Total reports': 'Kabuuang ulat',
  'Filter by status': 'Salain ayon sa estado',
  'Filter by category': 'Salain ayon sa kategorya',
  'All statuses': 'Lahat ng estado',
  'All categories': 'Lahat ng kategorya',
  'Category distribution': 'Bilang ayon sa kategorya',
  'Incident map': 'Mapa ng mga insidente',
  'See a concern in your community?': 'May napansin ka bang problema sa komunidad?',
  'Report it to your barangay.': 'Iulat ito sa iyong barangay.',
  Photo: 'Larawan',
  Location: 'Lokasyon',
  Details: 'Detalye',
  Review: 'Suriin',
  Step: 'Hakbang',
  Next: 'Susunod',
  Back: 'Bumalik',
  Edit: 'Baguhin',
  'No description added': 'Walang idinagdag na paglalarawan',
  'Finding your location…': 'Hinahanap ang lokasyon mo…',
  'Location set': 'Naitakda ang lokasyon',
  'Enter coordinates manually': 'Ilagay ang coordinates nang mano-mano',
  'Checking the photo…': 'Sinusuri ang larawan…',
  'You can continue while this runs.': 'Maaari kang magpatuloy habang tumatakbo ito.',
  'Retake photo': 'Kumuha ulit',
  'Choose another': 'Pumili ng iba',
  'Report sent': 'Naipadala ang ulat',
  'View my report': 'Tingnan ang ulat ko',
  'Make another report': 'Gumawa ng isa pang ulat',
  'Status path': 'Daloy ng estado',
  'Stay well away and do not touch the wire or anything it touches. If it is sparking or on the ground, warn people nearby and call your barangay or electric company right away.':
    'Lumayo at huwag hawakan ang kawad o anumang nakadikit dito. Kung kumikislap ito o nasa lupa, babalaan ang mga tao sa paligid at tawagan agad ang barangay o kompanya ng kuryente.',
  'Show password': 'Ipakita ang password',
  'Hide password': 'Itago ang password',
  'Use at least 12 characters.': 'Gumamit ng hindi bababa sa 12 character.',
  'Reviewed by barangay personnel': 'Sinusuri ng mga kawani ng barangay',
  'Reference no.': 'Numero ng sanggunian',
  'Track it anytime in My reports.': 'Subaybayan ito anumang oras sa Mga ulat ko.',
  Updates: 'Mga update',
  Help: 'Tulong',
  'Resident sections': 'Mga bahagi ng portal',
  'No updates yet.': 'Wala pang update.',
  'Mark read': 'Markahang nabasa',
  'Opening BarangAI…': 'Binubuksan ang BarangAI…',
  Flooding: 'Pagbaha',
  Potholes: 'Mga lubak',
  'Fallen trees': 'Mga natumbang puno',
  'Uncollected garbage': 'Hindi nakolektang basura',
  'Damaged signage': 'Sirang karatula',
  'Broken streetlights': 'Sirang ilaw sa kalye',
  'Exposed wiring': 'Nakalantad na kawad ng kuryente',
  Other: 'Iba pa',
  'Not set': 'Wala pa',
  Pending: 'Naghihintay',
  'Under Verification': 'Sinusuri',
  Accepted: 'Tinanggap',
  'In Progress': 'Isinasagawa',
  Resolved: 'Nalutas',
  Rejected: 'Tinanggihan',
  'Start verification': 'Simulan ang beripikasyon',
  'Accept report': 'Tanggapin ang ulat',
  'Reject report': 'Tanggihan ang ulat',
  'Mark in progress': 'Markahang isinasagawa',
  'Mark resolved': 'Markahang nalutas',
  'AI suggests': 'Mungkahi ng AI:',
  'Preview of incident photo': 'Preview ng larawan ng insidente',
  'Submitted incident': 'Naipasang insidente',
  'Report details': 'Detalye ng ulat',
  'Close details': 'Isara ang detalye',
  'Click the map to adjust the report pin': 'Pindutin ang mapa upang ilipat ang pin ng ulat',
  'What happened? Add details the photo may not show.':
    'Ano ang nangyari? Idagdag ang detalyeng hindi nakikita sa larawan.',
  'What was done, or which office was contacted?': 'Ano ang ginawa, o aling tanggapan ang kinausap?',
  'Type your question…': 'I-type ang tanong mo…',
  unread: 'hindi pa nababasa',
  Report: 'Ulat',
  of: 'sa',
  reports: 'ulat',
  Recorded: 'Naitala',
  Update: 'Update',
  'Similarity score': 'Antas ng pagkakahawig',
  'GPS is unavailable. Enter coordinates or place a pin on the map.':
    'Hindi magamit ang GPS. Maglagay ng coordinates o pin sa mapa.',
  'Location access was unavailable. Enter coordinates or place a pin on the map.':
    'Hindi nakuha ang lokasyon. Maglagay ng coordinates o pin sa mapa.',
  'Add a photo and category.': 'Magdagdag ng larawan at kategorya.',
  'Enter valid coordinates.': 'Maglagay ng wastong coordinates.',
  'Chat guidance is unavailable right now. You can still submit and track reports here.':
    'Hindi magamit ang chatbot ngayon. Maaari ka pa ring magpasa at sumubaybay ng ulat dito.',
  'I could not answer that request.': 'Hindi ko masagot ang tanong na iyon.',

  Home: 'Home',
  Account: 'Account',
  'Account and settings': 'Account at mga setting',
  'Language, appearance and sign out': 'Wika, hitsura, at pag-sign out',
  Appearance: 'Hitsura',
  Automatic: 'Awtomatiko',
  Light: 'Maliwanag',
  Dark: 'Madilim',
  'Matches your device setting.': 'Sumusunod sa setting ng iyong device.',
  'Stays this way on this device.': 'Mananatili ito sa device na ito.',
  Resident: 'Residente',
  'Barangay staff': 'Kawani ng barangay',
  Administrator: 'Tagapangasiwa',
  'Good morning': 'Magandang umaga',
  'Good afternoon': 'Magandang hapon',
  'Good evening': 'Magandang gabi',
  'Thanks for looking out for your barangay.': 'Salamat sa pagmamalasakit sa inyong barangay.',
  'Spotted a problem nearby?': 'May napansin kang problema sa paligid?',
  'Snap a photo and pin the spot. Your barangay takes it from there.':
    'Kumuha ng larawan at ituro ang lugar. Ang barangay na ang bahala.',
  'Report a concern': 'Mag-ulat ng problema',
  'Open reports': 'Mga bukas na ulat',
  'See all': 'Tingnan lahat',
  'Nothing open right now': 'Walang bukas na ulat ngayon',
  'Reports you send will show up here.': 'Dito lalabas ang mga ulat na ipapasa mo.',
  'Latest updates': 'Pinakabagong update',
  'Report update': 'Update sa ulat',
  'Emergency? Call 911': 'Emergency? Tumawag sa 911',
  'For fires, injuries or danger to life, call first, then report.':
    'Kung may sunog, nasaktan, o panganib sa buhay, tumawag muna bago mag-ulat.',
  All: 'Lahat',
  Open: 'Bukas',
  Closed: 'Sarado',
  'Show reports': 'Ipakita ang mga ulat',
  'No reports in this view.': 'Walang ulat dito.',
  'Photo, categories and status history': 'Larawan, kategorya, at kasaysayan ng estado',
  'We will tell you here when your reports move.': 'Sasabihan ka namin dito kapag may pagbabago sa ulat mo.',
  'Your report was received.': 'Natanggap ang ulat mo.',
  'Barangay staff are checking your report.': 'Sinusuri ng kawani ng barangay ang ulat mo.',
  'Your report was accepted.': 'Tinanggap ang ulat mo.',
  'Work on your report has started.': 'Sinimulan na ang pag-aksiyon sa ulat mo.',
  'Your report was resolved.': 'Nalutas na ang ulat mo.',
  'Your report was not accepted.': 'Hindi tinanggap ang ulat mo.',
  'Hi there!': 'Kumusta!',
  or: 'o',
  'Hi! I can help you report concerns and follow up on them.':
    'Kumusta! Matutulungan kitang mag-ulat ng problema at subaybayan ito.',
  'How do I report flooding?': 'Paano mag-ulat ng pagbaha?',
  'What happens after I submit?': 'Ano ang mangyayari pagkatapos kong magpasa?',
  'How do I track my report?': 'Paano ko susubaybayan ang ulat ko?',
  'Typing…': 'Nagta-type…',
  Overview: 'Buod',
  Reports: 'Mga ulat',
  Map: 'Mapa',
  'Toggle sidebar': 'Ipakita o itago ang sidebar',
  'waiting for review': 'naghihintay ng pagsusuri',
  'Open review queue': 'Buksan ang mga susuriin',
  'Waiting for review': 'Naghihintay ng pagsusuri',
  'Pending or being verified': 'Naghihintay o sinusuri',
  'Being worked on': 'Inaaksiyunan',
  'Accepted or in progress': 'Tinanggap o isinasagawa',
  'Closed with work done': 'Sarado na, may naisagawang aksiyon',
  'All time, every status': 'Lahat ng panahon at estado',
  'New reports': 'Mga bagong ulat',
  'Last 14 days': 'Nakaraang 14 na araw',
  'As reported by residents': 'Ayon sa ulat ng residente',
  'Needs attention': 'Kailangang tingnan',
  'Newest reports waiting for a staff decision': 'Pinakabagong ulat na naghihintay ng pasiya ng kawani',
  'View all': 'Tingnan lahat',
  'All caught up': 'Wala nang naiiwan',
  'No reports are waiting for review.': 'Walang ulat na naghihintay ng pagsusuri.',
  Status: 'Estado',
  Submitted: 'Naipasa',
  'Open map': 'Buksan ang mapa',
  'Search reports': 'Maghanap ng ulat',
  'Search by reference, words or category': 'Hanapin ayon sa numero, salita, o kategorya',
  'No reports match these filters.': 'Walang ulat na tugma sa salaan.',
  'Select a report to review': 'Pumili ng ulat na susuriin',
  'Photos, categories, history and staff actions open here.':
    'Dito lalabas ang larawan, kategorya, kasaysayan, at aksiyon ng kawani.',
  'Click a pin to open it.': 'Pindutin ang pin upang buksan.',
  Added: 'Naidagdag',
  'Not added yet': 'Wala pa',
  'Not set yet': 'Hindi pa naitatakda',
  'Not chosen yet': 'Hindi pa napipili',
  'Your report': 'Ang ulat mo',
  'Stand where you can see the whole problem, and keep faces and plate numbers out of the photo.':
    'Tumayo kung saan kita ang buong problema, at iwasang makuha ang mukha at plaka sa larawan.',
  'Choose a report': 'Pumili ng ulat',
  'Its photo, categories and status history open here.':
    'Dito lalabas ang larawan, kategorya, at kasaysayan ng estado nito.',
  'Filled by AI · you can edit': 'Pinunan ng AI · puwede mong baguhin',
  'The AI writes this from your photo when it can. Add a short note if it did not.':
    'Isinusulat ito ng AI mula sa larawan mo kapag kaya nito. Magdagdag ng maikling tala kung hindi.',
  'Take a clear photo. The AI fills in the details for you, and you can change anything.':
    'Kumuha ng malinaw na larawan. Pupunan ng AI ang mga detalye, at puwede mong baguhin ang anuman.',
  'or drag a photo here': 'o i-drag dito ang larawan',
  'We filled in the category for you. You can change it on the Details step.':
    'Pinunan namin ang kategorya para sa iyo. Puwede mo itong baguhin sa hakbang na Detalye.',
  Dashboard: 'Dashboard',
  Records: 'Mga tala',
  Support: 'Suporta',
  Show: 'Ipakita',
  'Need help?': 'Kailangan ng tulong?',
  'Start reviewing': 'Simulan ang pagsusuri',
  Waiting: 'Naghihintay',
  Working: 'Ginagawa',
  open: 'bukas',
  resolved: 'nalutas',
  'Call 911': 'Tumawag sa 911',
  'AI unsure · please check': 'Hindi tiyak ang AI · pakisuri',
  'Blocks the road': 'Nakaharang sa daan',
  'Electrical hazard': 'Panganib sa kuryente',
  'Risk to people': 'Panganib sa tao',
  'From your photo': 'Mula sa larawan mo',
  'From your phone': 'Mula sa telepono mo',
  'The AI noticed:': 'Napansin ng AI:',
  'We filled in the category and a description. You can change both on the Details step.':
    'Pinunan namin ang kategorya at paglalarawan. Puwede mong baguhin ang dalawa sa hakbang na Detalye.',
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setValue] = useState<Language>(() =>
    localStorage.getItem('barangai-language') === 'fil' ? 'fil' : 'en',
  )
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  function setLanguage(value: Language) {
    localStorage.setItem('barangai-language', value)
    document.documentElement.lang = value
    setValue(value)
  }
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
export function useText() {
  const { language } = useLanguage()
  return (text: string) =>
    language === 'fil'
      ? (filipino[text] ??
        (text.startsWith('Request failed (') ? `Hindi natuloy ang kahilingan ${text.slice(15)}. Subukan muli.` : text))
      : text
}
export function Txt({ children }: { children: string }) {
  const t = useText()
  return <>{t(children)}</>
}
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  return (
    <button
      className={`inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-medium transition-colors ${className}`}
      type="button"
      aria-label={language === 'en' ? 'Filipino interface' : 'English interface'}
      onClick={() => setLanguage(language === 'en' ? 'fil' : 'en')}
    >
      {language === 'en' ? 'Filipino' : 'English'}
    </button>
  )
}
