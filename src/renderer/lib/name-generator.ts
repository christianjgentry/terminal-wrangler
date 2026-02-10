// Random name generator utility

const firstNames: string[] = [
  // Western names
  'James', 'Emma', 'Oliver', 'Sophia', 'William', 'Isabella', 'Benjamin', 'Mia',
  'Lucas', 'Charlotte', 'Henry', 'Amelia', 'Alexander', 'Harper', 'Sebastian',
  'Maria', 'Carlos', 'Elena', 'Diego', 'Sofia', 'Miguel', 'Lucia', 'Antonio',
  'Pierre', 'Marie', 'Jean', 'Claire', 'Hans', 'Greta', 'Marco', 'Giulia',
  // Asian names
  'Wei', 'Mei', 'Chen', 'Yuki', 'Haruki', 'Sakura', 'Min-jun', 'Ji-woo',
  'Nguyen', 'Linh', 'Raj', 'Priya', 'Arjun', 'Ananya', 'Vikram', 'Deepa',
  'Kenji', 'Aiko', 'Hiroshi', 'Yumi', 'Soo-yeon', 'Hyun', 'Tran', 'Anh',
  // African names
  'Kwame', 'Amara', 'Chidi', 'Zainab', 'Kofi', 'Fatima', 'Oluwaseun', 'Adaeze',
  'Tendai', 'Naledi', 'Jabari', 'Nia', 'Sekou', 'Amina', 'Tariq', 'Imani',
  // Middle Eastern names
  'Omar', 'Layla', 'Hassan', 'Nadia', 'Yusuf', 'Salma', 'Rami', 'Dina',
  'Khalid', 'Yasmin', 'Faisal', 'Leila', 'Samir', 'Hana', 'Amir', 'Rana'
]

const lastNames: string[] = [
  // Western names
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Dubois', 'Bernard', 'Moreau', 'Mueller', 'Schmidt', 'Rossi', 'Bianchi', 'Russo',
  // Asian names
  'Wang', 'Li', 'Zhang', 'Chen', 'Liu', 'Tanaka', 'Suzuki', 'Yamamoto',
  'Kim', 'Park', 'Lee', 'Choi', 'Nguyen', 'Tran', 'Pham', 'Le',
  'Patel', 'Sharma', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Rao', 'Mehta',
  // African names
  'Okafor', 'Diallo', 'Mensah', 'Osei', 'Kone', 'Traore', 'Ndlovu', 'Moyo',
  'Mwangi', 'Kamau', 'Obi', 'Adeyemi', 'Boateng', 'Asante', 'Nkomo', 'Dlamini',
  // Middle Eastern names
  'Hassan', 'Ali', 'Ahmed', 'Khan', 'Rahman', 'Karim', 'Malik', 'Yousef',
  'Nasser', 'Haddad', 'Khoury', 'Abboud', 'Saleh', 'Mansour', 'Bakir', 'Farah'
]

export function generateRandomName(): string {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)]
  const last = lastNames[Math.floor(Math.random() * lastNames.length)]
  return `${first} ${last}`
}
