# Target API URL
$BaseUrl = "http://15.207.235.143:30950/api/employees"

# Indian First and Last Names
$indianFirstNames = @(
    "Aarav", "Aditi", "Ananya", "Arjun", "Bhavya", "Dev", "Diya", "Ishaan", "Kavya", "Karan",
    "Madhav", "Meera", "Neha", "Nikhil", "Pooja", "Pranav", "Rohan", "Riya", "Sanjay", "Shreya",
    "Siddharth", "Sneha", "Tanvi", "Varun", "Vikram", "Aditya", "Akash", "Amrita", "Aniket", "Anushka",
    "Deepak", "Divya", "Gautam", "Harish", "Ishita", "Karthik", "Manish", "Nisha", "Rahul", "Ritu",
    "Sachin", "Sameer", "Shikha", "Suresh", "Tarun", "Vidya", "Yash", "Zoya", "Alok", "Aman"
)

$indianLastNames = @(
    "Sharma", "Verma", "Patel", "Rao", "Nair", "Mehta", "Joshi", "Gupta", "Kumar", "Singh",
    "Chawla", "Mukherjee", "Banerjee", "Deshmukh", "Kulkarni", "Iyer", "Iyengar", "Pillai", "Reddy", "Gowda",
    "Hegde", "Bhat", "Shah", "Desai", "Jain", "Agarwal", "Kapoor", "Khan", "Malhotra", "Saxena",
    "Srivastava", "Tripathi", "Trivedi", "Pandey", "Mishra", "Dutta", "Bose", "Roy", "Das", "Sen"
)

# Global First and Last Names
$globalFirstNames = @(
    "Alexander", "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella",
    "William", "Mia", "James", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper", "Henry", "Evelyn",
    "Michael", "Emily", "Daniel", "Elizabeth", "Jacob", "Mila", "Logan", "Ella", "Jackson", "Avery",
    "Levi", "Sofia", "Sebastian", "Camila", "Jack", "Aria", "Owen", "Scarlett", "Theodore", "Victoria",
    "Aiden", "Madison", "Samuel", "Luna", "Joseph", "Grace", "John", "Chloe", "David", "Penelope"
)

$globalLastNames = @(
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"
)

# Domains, Departments, Roles, Statuses
$domains = @("techflux.io", "brightgrid.com", "vertexlabs.co", "nimbuscore.net", "quantaworks.com", "stackhive.io", "corelynx.co", "ironloop.com", "fluxbyte.net", "pivotforge.io")
$departments = @("Engineering", "DevOps", "Operations", "Product", "Design", "Sales", "Marketing", "HR", "Finance", "Legal")
$roles = @("Software Engineer", "Frontend Engineer", "Backend Developer", "DevOps Specialist", "Product Manager", "UI/UX Designer", "Data Analyst", "QA Engineer", "HR Specialist", "Accountant")
$statuses = @("Active", "Active", "Active", "Inactive", "On Leave")

$employees = @()

# 1. Generate 300 Indian Employees
for ($i = 1; $i -le 300; $i++) {
    $first = $indianFirstNames | Get-Random
    $last = $indianLastNames | Get-Random
    $domain = $domains | Get-Random
    $cleanFirst = ($first -replace "[^a-zA-Z]", "").ToLower()
    $cleanLast = ($last -replace "[^a-zA-Z]", "").ToLower()
    
    $employees += @{
        name       = "$first $last"
        email      = "$cleanFirst.$cleanLast$i@$domain"
        department = ($departments | Get-Random)
        role       = ($roles | Get-Random)
        salary     = (Get-Random -Minimum 50000 -Maximum 120000)
        status     = ($statuses | Get-Random)
    }
}

# 2. Generate 200 Global Employees
for ($i = 301; $i -le 500; $i++) {
    $first = $globalFirstNames | Get-Random
    $last = $globalLastNames | Get-Random
    $domain = $domains | Get-Random
    $cleanFirst = ($first -replace "[^a-zA-Z]", "").ToLower()
    $cleanLast = ($last -replace "[^a-zA-Z]", "").ToLower()
    
    $employees += @{
        name       = "$first $last"
        email      = "$cleanFirst.$cleanLast$i@$domain"
        department = ($departments | Get-Random)
        role       = ($roles | Get-Random)
        salary     = (Get-Random -Minimum 50000 -Maximum 120000)
        status     = ($statuses | Get-Random)
    }
}

# Shuffle list
$employees = $employees | Get-Random -Count $employees.Count

# Seed Employees via API
$count = 0
foreach ($emp in $employees) {
    $count++
    $json = $emp | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $BaseUrl -Method Post -Body $json -ContentType "application/json"
        Write-Host "[$count/500] Successfully added: $($emp.name) ($($emp.email))" -ForegroundColor Green
    }
    catch {
        Write-Host "[$count/500] Failed to add: $($emp.name). Error: $_" -ForegroundColor Red
    }
}