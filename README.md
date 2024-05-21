# Basic Blog

## Introduction
This project is a simplified clone of Twitter, created as part of a web programming class. The application allows users to sign up, log in, make posts, and view posts from other users. It is built using modern web technologies and follows best practices in web development.

## Features
- **User Authentication:** Sign up and log in functionality using basic authentication methods.
- **Tweeting:** Post, like, and delete posts.
- **User Profiles:** View your profile.
- **Responsive Design:** Works well on both desktop and mobile devices.
- **Sessions** Uses Express-Sessions to manage user sessions.

## Technologies Used
- **Frontend:** HTML, CSS, JavaScript, Handlebars
- **Backend:** Node.js, Express, Express-Sessions

## Setup and Installation

### Prerequisites
- Node.js (v14.x or later)

### Installation Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/RedKnite5/Microblog.git
   cd Microblog
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add the following:
   ```plaintext
   EMOJI_API_KEY=your_emoji_api_access_key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`.


## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

