// Indian cities and towns grouped by state / union territory, used by the searchable
// city dropdowns (e.g. company "Branches"). Anything missing can still be typed in as a
// custom entry by the user.
const BY_STATE = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Kakinada", "Kadapa", "Anantapur", "Eluru", "Ongole", "Chittoor", "Machilipatnam", "Srikakulam", "Vizianagaram", "Amaravati", "Proddatur", "Nandyal", "Adoni", "Madanapalle", "Tenali", "Bhimavaram", "Hindupur", "Tadepalligudem", "Dharmavaram", "Gudivada", "Narasaraopet", "Chilakaluripet", "Tadipatri", "Guntakal", "Dharmavaram", "Srikalahasti", "Palakollu", "Narsapuram", "Amalapuram", "Mangalagiri", "Sattenapalle", "Bapatla", "Repalle", "Markapur", "Gudur", "Kavali", "Rayachoty", "Puttur AP", "Punganur", "Tuni", "Samalkot", "Peddapuram"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Dhubri", "Diphu", "North Lakhimpur", "Karimganj"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra", "Samastipur", "Hajipur", "Sasaram", "Dehri", "Siwan", "Motihari", "Nawada", "Bettiah", "Saharsa"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Raigarh", "Jagdalpur", "Ambikapur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Nadiad", "Morbi", "Mehsana", "Bharuch", "Navsari", "Porbandar", "Surendranagar", "Gandhidham", "Bhuj", "Vapi", "Valsad", "Palanpur", "Godhra", "Amreli", "Patan", "Ankleshwar", "Veraval"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak", "Sonipat", "Yamunanagar", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Jind", "Thanesar", "Kaithal", "Rewari", "Palwal", "Manesar"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Baddi", "Kullu", "Manali", "Hamirpur", "Una", "Palampur"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh", "Medininagar", "Chaibasa"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Dharwad", "Mangaluru", "Belagavi", "Kalaburagi", "Davangere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru", "Raichur", "Bidar", "Hospet", "Hassan", "Udupi", "Mandya", "Chitradurga", "Kolar", "Chikkamagaluru", "Gadag", "Bagalkot", "Karwar", "Madikeri", "Ramanagara", "Yelahanka", "Whitefield", "Electronic City", "Chikkaballapur", "Doddaballapur", "Hosur Road", "Nelamangala", "Anekal", "Bidadi", "Sirsi", "Puttur", "Sagara", "Koppal", "Yadgir", "Mudhol", "Gokak", "Athani", "Bhadravati", "Harihar", "Ranebennur", "Haveri", "Chikodi", "Jamkhandi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Kannur", "Kottayam", "Malappuram", "Kasaragod", "Pathanamthitta", "Idukki", "Thalassery", "Kayamkulam", "Muvattupuzha", "Perinthalmanna", "Tirur", "Ernakulam", "Angamaly", "Aluva", "Changanassery", "Kattappana", "Chalakudy", "Irinjalakuda", "Kodungallur", "Guruvayur", "Ponnani", "Nedumangad", "Attingal", "Neyyattinkara", "Varkala", "Adoor", "Pala", "Thodupuzha", "Kothamangalam", "Perumbavoor", "Taliparamba", "Payyannur", "Vadakara", "Koyilandy", "Manjeri", "Nilambur", "Cherthala", "Haripad", "Mavelikkara", "Kalamassery", "Thrippunithura", "Edappally", "Kakkanad"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Murwara", "Singrauli", "Burhanpur", "Khandwa", "Bhind", "Chhindwara", "Guna", "Shivpuri", "Vidisha", "Damoh", "Mandsaur", "Khargone", "Neemuch", "Hoshangabad", "Itarsi", "Betul", "Seoni", "Datia", "Nagda"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Chhatrapati Sambhajinagar", "Solapur", "Kolhapur", "Navi Mumbai", "Amravati", "Nanded", "Sangli", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Parbhani", "Ichalkaranji", "Jalna", "Ambernath", "Bhiwandi", "Panvel", "Malegaon", "Kalyan", "Dombivli", "Vasai-Virar", "Mira-Bhayandar", "Ulhasnagar", "Pimpri-Chinchwad", "Satara", "Beed", "Yavatmal", "Gondia", "Wardha", "Bhandara", "Osmanabad", "Ratnagiri", "Baramati", "Ichalkaranji", "Hinjewadi", "Lonavala", "Shirdi", "Alibag"],
  "Manipur": ["Imphal", "Thoubal", "Churachandpur", "Bishnupur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Serchhip"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda", "Jeypore", "Angul", "Dhenkanal", "Kendujhar", "Rayagada", "Paradip"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur", "Batala", "Moga", "Abohar", "Malerkotla", "Khanna", "Phagwara", "Muktsar", "Barnala", "Firozpur", "Kapurthala", "Zirakpur", "Rajpura", "Sangrur", "Fazilka"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Pali", "Sri Ganganagar", "Kishangarh", "Baran", "Dhaulpur", "Tonk", "Beawar", "Hanumangarh", "Gangapur City", "Sawai Madhopur", "Churu", "Jhunjhunu", "Chittorgarh", "Barmer", "Jaisalmer", "Mount Abu", "Bhiwadi", "Neemrana"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Dindigul", "Thanjavur", "Ranipet", "Sivakasi", "Karur", "Udhagamandalam", "Hosur", "Nagercoil", "Kancheepuram", "Kumbakonam", "Cuddalore", "Pollachi", "Tiruvannamalai", "Pudukkottai", "Namakkal", "Krishnagiri", "Dharmapuri", "Rajapalayam", "Virudhunagar", "Ambur", "Neyveli", "Mayiladuthurai", "Karaikudi", "Nagapattinam", "Villupuram", "Ariyalur", "Perambalur", "Theni", "Ramanathapuram", "Tiruvallur", "Avadi", "Tambaram", "Chengalpattu", "Sriperumbudur", "Mettupalayam", "Gobichettipalayam", "Coonoor", "Kodaikanal", "Sholinganallur", "Ambattur", "Guindy", "OMR Chennai", "Saravanampatti", "Gandhipuram", "Peelamedu", "Singanallur", "Tiruchengode", "Palani", "Tenkasi", "Thiruvarur", "Kallakurichi", "Tirupattur", "Pattukkottai", "Arakkonam", "Gudiyatham", "Vaniyambadi", "Arani", "Chidambaram", "Mannargudi", "Paramakudi", "Aruppukottai", "Sattur", "Srivilliputhur", "Kovilpatti", "Valparai", "Bhavani", "Sathyamangalam", "Attur", "Mettur", "Omalur", "Palladam", "Dharapuram", "Udumalaipettai", "Pallavaram", "Poonamallee", "Maraimalai Nagar", "Kangeyam", "Manapparai", "Lalgudi", "Srirangam", "Perundurai", "Kumarapalayam", "Rasipuram", "Sivaganga", "Devakottai", "Tindivanam", "Panruti", "Thiruvottiyur", "Medavakkam", "Velachery", "Porur", "Perungudi", "Siruseri", "Puducherry", "Kanyakumari", "Marthandam", "Thuckalay", "Sankari", "Komarapalayam", "Vadalur", "Thirumangalam", "Usilampatti", "Melur", "Sirkazhi", "Vedaranyam", "Thiruthuraipoondi", "Thiruvarur", "Jayankondam", "Musiri", "Thuraiyur", "Vridhachalam", "Gingee", "Sholingur", "Kuzhithurai"],
  "Telangana": ["Hyderabad", "Secunderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahabubnagar", "Nalgonda", "Adilabad", "Suryapet", "Siddipet", "Miryalaguda", "Jagtial", "Mancherial", "Kothagudem", "Bodhan", "Sangareddy", "Vikarabad", "Kukatpally", "Madhapur", "Gachibowli", "HITEC City", "Ameerpet", "Dilsukhnagar", "Uppal", "Hitech City", "Kondapur", "Begumpet"],
  "Tripura": ["Agartala", "Udaipur (Tripura)", "Dharmanagar", "Kailasahar", "Ambassa"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida", "Greater Noida", "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Budaun", "Rampur", "Shahjahanpur", "Farrukhabad", "Ayodhya", "Maunath Bhanjan", "Hapur", "Etawah", "Mirzapur", "Bulandshahr", "Sambhal", "Amroha", "Hardoi", "Fatehpur", "Raebareli", "Orai", "Sitapur", "Bahraich", "Modinagar", "Unnao", "Jaunpur", "Lakhimpur", "Hathras", "Banda", "Pilibhit", "Barabanki", "Mughalsarai", "Khurja", "Gonda", "Mainpuri", "Lalitpur", "Etah", "Deoria", "Basti", "Azamgarh", "Sultanpur", "Vrindavan", "Faizabad"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Pithoragarh", "Nainital", "Mussoorie", "Almora", "Kotdwar", "Pantnagar"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Baharampur", "Habra", "Kharagpur", "Shantipur", "Dankuni", "Dhulian", "Ranaghat", "Haldia", "Raiganj", "Krishnanagar", "Nabadwip", "Medinipur", "Jalpaiguri", "Balurghat", "Basirhat", "Bankura", "Chakdaha", "Darjeeling", "Alipurduar", "Purulia", "Barasat", "Salt Lake", "New Town", "Rajarhat"],
  "Delhi (NCT)": ["New Delhi", "Delhi", "Dwarka", "Rohini", "Saket", "Karol Bagh", "Janakpuri", "Laxmi Nagar", "Connaught Place", "Nehru Place", "Pitampura"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  "Jammu & Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore", "Kathua", "Udhampur", "Punch", "Rajouri", "Kupwara", "Budgam"],
  "Ladakh": ["Leh", "Kargil"],
  "Andaman & Nicobar": ["Port Blair"],
  "Dadra & Nagar Haveli and Daman & Diu": ["Silvassa", "Daman", "Diu"],
  "Lakshadweep": ["Kavaratti"],
};


// Other names people commonly use for the same place (matched when searching).
export const CITY_ALIASES = {
  "Tiruchirappalli": ["Trichy", "Tiruchi", "Tiruchirapalli"],
  "Bengaluru": ["Bangalore"],
  "Mysuru": ["Mysore"],
  "Kozhikode": ["Calicut"],
  "Kochi": ["Cochin"],
  "Thiruvananthapuram": ["Trivandrum", "Tvm"],
  "Visakhapatnam": ["Vizag", "Vishakhapatnam"],
  "Mumbai": ["Bombay"],
  "Chennai": ["Madras"],
  "Kolkata": ["Calcutta"],
  "Puducherry": ["Pondicherry", "Pondy"],
  "Udhagamandalam": ["Ooty", "Ootacamund"],
  "Thoothukudi": ["Tuticorin"],
  "Kancheepuram": ["Kanchipuram", "Kanchi"],
  "Gurugram": ["Gurgaon"],
  "Varanasi": ["Benares", "Banaras", "Kashi"],
  "Prayagraj": ["Allahabad"],
  "Vadodara": ["Baroda"],
  "Mangaluru": ["Mangalore"],
  "Belagavi": ["Belgaum"],
  "Hubballi": ["Hubli"],
  "Shivamogga": ["Shimoga"],
  "Kalaburagi": ["Gulbarga"],
  "Vijayapura": ["Bijapur"],
  "Thrissur": ["Trichur"],
  "Alappuzha": ["Alleppey"],
  "Palakkad": ["Palghat"],
  "Kollam": ["Quilon"],
  "Tirunelveli": ["Nellai"],
  "Panaji": ["Panjim"],
  "Tiruppur": ["Tirupur"],
  "Coimbatore": ["Kovai", "CBE"],
  "Madurai": ["Maduri"],
  "Hosur": ["Hosur Tamil Nadu"],
  "Thanjavur": ["Tanjore"],
  "Nagercoil": ["Kanyakumari"],
  "Chhatrapati Sambhajinagar": ["Aurangabad"],
  "Navi Mumbai": ["New Bombay"],
  "Secunderabad": ["Sec-bad"],
  "Vijayawada": ["Bezawada"],
  "Tirupati": ["Tirumala"],
  "Dharwad": ["Dharwar"],
  "Mayiladuthurai": ["Mayavaram", "Myladuthurai"],
  "Kumbakonam": ["Kumbakkonam"],
  "Karaikudi": ["Karaikkudi"],
  "Cuddalore": ["Kadalur"],
  "Villupuram": ["Viluppuram"],
  "Ambattur": ["Ambathur"],
};

// Flat, de-duplicated, sorted list: [{ city, state, aliases }]
const seen = new Set();
export const CITIES_BY_STATE = BY_STATE;

export const INDIAN_CITIES = Object.entries(BY_STATE)
  .flatMap(([state, cities]) => cities.map((city) => ({ city, state, aliases: CITY_ALIASES[city] || [] })))
  .filter(({ city }) => {
    const k = city.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  })
  .sort((a, b) => a.city.localeCompare(b.city));
