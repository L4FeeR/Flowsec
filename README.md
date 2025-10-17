# FlowSec - Secure Messaging Platform# Flowsec - Secure Chat Application



🔐 End-to-end encrypted chat application with passwordless authentication.A modern, secure chat application with **passwordless authentication**, end-to-end encryption, and integrated file/link security scanning.



## Features## 🔐 Key Features



- ✅ **End-to-End Encryption** - RSA-2048 + AES-256-GCM hybrid encryption### Passwordless Authentication

- ✅ **Passwordless Authentication** - Magic link login via Supabase- **OTP-only login** - No passwords, no magic links

- ✅ **Real-time Messaging** - Instant encrypted message delivery- 6-digit verification codes sent to email

- ✅ **Dark Mode** - Beautiful dark/light theme toggle- Secure, time-limited one-time codes

- ✅ **User Profiles** - Customizable avatars and usernames- Eliminates password-related vulnerabilities

- ✅ **Secure Key Management** - Client-side key generation and storage

### Security Features (Planned)

## Tech Stack- 🔒 **End-to-End Encryption** - Public/private key cryptography

- 🛡️ **VirusTotal Integration** - Automatic file and link scanning

- **Frontend**: HTML5, CSS3, Vanilla JavaScript- 🔑 **Zero-Knowledge Architecture** - Your data, your eyes only

- **Backend**: Supabase (PostgreSQL + Auth)

- **Encryption**: Web Crypto API### User Features

- **Deployment**: GitHub Pages- Modern, clean UI with light/dark theme toggle

- User profiles with customizable avatars

## Quick Start- Gender-inclusive user information

- Real-time messaging (coming soon)

### 1. Clone the Repository

## 🚀 Quick Start

```bash

git clone https://github.com/yourusername/flowsec.git### Prerequisites

cd flowsec- A Supabase account and project

```- Modern web browser

- Email service configured in Supabase

### 2. Setup Supabase

### Setup Steps

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the SQL scripts in order:1. **Clone or download this repository**

   - `QUICK_SETUP.sql` - Creates profiles table

   - `ADD_ENCRYPTION_KEYS.sql` - Adds encryption columns2. **Configure Supabase**

   - `CREATE_MESSAGES_TABLE.sql` - Creates messages table   - Create a new Supabase project

   - Update credentials in `js/config.js`

### 3. Configure Environment   - Follow the setup guide in `PASSWORDLESS_OTP_SETUP.md`



Update `js/config.js` with your Supabase credentials:3. **Set up the database**

   - Run the SQL from `database-schema.sql`

```javascript   - Create the `profile-pics` storage bucket

const SUPABASE_URL = 'your-project-url.supabase.co';

const SUPABASE_KEY = 'your-anon-key';4. **Configure OTP-only authentication**

```   - See `PASSWORDLESS_OTP_SETUP.md` for detailed instructions

   - Disable password authentication in Supabase

### 4. Deploy to GitHub Pages   - Enable email OTP with 6-digit codes



1. Push to GitHub5. **Open the app**

2. Go to **Settings → Pages**   - Simply open `index.html` in your browser

3. Source: **GitHub Actions**   - Or use a local server: `python3 -m http.server 8000`

4. Auto-deploys on every push!

## 📁 Project Structure

## Project Structure

```

```Flowsec/

flowsec/├── index.html              # Entry point (redirects to login)

├── index.html              # Landing page├── pages/

├── pages/│   ├── login.html          # Passwordless login with OTP

│   ├── signup.html         # User registration│   ├── signup.html         # User registration with OTP

│   ├── login.html          # Magic link login│   └── chat.html           # Chat interface (in progress)

│   ├── complete-profile.html  # Profile setup + key generation├── css/

│   └── chat.html           # Main chat interface│   └── auth.css            # Modern authentication UI styling

├── js/├── js/

│   ├── config.js           # Supabase config│   ├── config.js           # Supabase credentials

│   ├── auth.js             # Authentication│   ├── supabase-client.js  # Supabase client initialization

│   ├── chat.js             # Chat functionality│   ├── auth.js             # OTP authentication logic

│   ├── encryption.js       # E2EE implementation│   └── theme-toggle.js     # Light/dark theme switcher

│   └── theme-toggle.js     # Dark mode└── docs/

└── css/    ├── PASSWORDLESS_OTP_SETUP.md  # OTP configuration guide

    └── auth.css            # Styles    └── DATABASE_SETUP.md          # Database schema guide

``````



## Security Features## 🎨 UI/UX Features



- **RSA-OAEP 2048-bit** for key exchange- **Modern Design** - Glassmorphism effects, smooth animations

- **AES-GCM 256-bit** for message encryption- **Responsive Layout** - Adapts to mobile, tablet, and desktop

- **PBKDF2** (100k iterations) for key derivation- **Theme Toggle** - Seamless light/dark mode switching

- Client-side key generation- **Dynamic Forms** - OTP field appears inline, no page redirects

- Private keys encrypted before localStorage- **Accessibility** - Semantic HTML, keyboard navigation

- Supabase Row Level Security policies

## 🔧 Authentication Flow

## Usage

### Login

1. **Sign up** → Receive magic link → Complete profile1. User enters email address

2. **Keys generated automatically** during setup2. Click "Send OTP Code"

3. **Login** → Select user → Send encrypted messages3. 6-digit code is sent to email

4. Only recipient can decrypt your messages4. OTP input field appears on the same page

5. User enters code and clicks "Verify Code"

## License6. Authenticated → redirected to chat



MIT License### Signup

1. User fills out: username, email, gender, profile picture

## Contributing2. Click "Create Account"

3. 6-digit code is sent to email

Pull requests welcome! Please test thoroughly before submitting.4. OTP input field appears on the same page

5. User enters code and clicks "Verify Code"

---6. Profile picture uploaded to Supabase Storage

7. User profile created in database

**⚠️ Note**: This is a demonstration project. For production, add rate limiting, CSP headers, and regular security audits.8. Authenticated → redirected to chat


## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (CSS Variables), Vanilla JavaScript
- **Backend**: Supabase (Auth, Database, Storage)
- **Font**: Inter (Google Fonts)
- **Icons**: Font Awesome
- **Authentication**: Email OTP (passwordless)
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage (for profile pictures)

## 📋 Database Schema

### `profiles` Table
- `id` (UUID, Primary Key) - Links to auth.users
- `username` (TEXT, Unique) - User's display name
- `gender` (TEXT) - User's gender identity
- `avatar_url` (TEXT) - URL to profile picture
- `created_at` (TIMESTAMP) - Account creation time

## 🔜 Coming Soon

- [ ] Real-time chat functionality
- [ ] File and link sharing
- [ ] VirusTotal integration for security scanning
- [ ] End-to-end encryption (public/private key)
- [ ] Message history and search
- [ ] User presence indicators
- [ ] Typing indicators

## 🔒 Security

This application implements multiple layers of security:

1. **Passwordless Auth** - No passwords to steal or crack
2. **Time-limited OTPs** - Codes expire after set duration
3. **Single-use Codes** - Each OTP can only be used once
4. **Email Verification** - Ensures users own their email address
5. **Row Level Security** - Database access controlled by user ID
6. **Public/Private Keys** - End-to-end encryption (planned)
7. **VirusTotal Scanning** - Malware detection (planned)

## 📝 License

This project is for educational and demonstration purposes.

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

## 📞 Support

For issues or questions, please refer to:
- `PASSWORDLESS_OTP_SETUP.md` - Authentication configuration
- `DATABASE_SETUP.md` - Database setup
- Supabase documentation: https://supabase.com/docs
