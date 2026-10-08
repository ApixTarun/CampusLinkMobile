# CampusLink Mobile Prototype

React Native + Expo prototype for a campus placement workflow connecting students, placement officers, and recruiters.

The interface respects device safe areas, and its main screens and dialogs scroll on smaller displays.

On every app launch, an animated CampusLink welcome screen leads into role selection. Student selection opens registration/login; Placement and Recruiter open their workspaces. Student accounts can log out from Profile and return to login. The moon/sun button switches themes.

## Student account demo

The mobile app uses the auth API in `server/server.js`. Passwords are never saved in the app or stored as readable text: the server stores salted scrypt verifiers, enforces a 15-character passphrase minimum, limits repeated login attempts, and issues short-lived bearer tokens. Student registration numbers are stored as keyed digests for duplicate checks.

For local development, start this project with `npm start`. This starts the auth API and Expo together, generates a private local auth secret, and detects the Expo/Metro host. Keep the terminal open while using the development app. For a physical phone, use Expo's **LAN** connection, keep the phone and computer on the same Wi-Fi, and allow Node.js through the Windows firewall if prompted.

### Deploy the account API for a standalone APK

A physical phone cannot reach the Android-emulator-only address `10.0.2.2`. The standalone APK must be built with the public HTTPS URL of a running account API. This repository includes a Render Blueprint in `render.yaml`; it provisions a Node web service, generated private auth secret, and persistent disk for student accounts. The persistent disk requires a paid Render service.

1. Push this project to a private GitHub repository, then in Render choose **New → Blueprint** and connect that repository. Review and apply the `render.yaml` blueprint.
2. Wait for Render to report the service healthy at `/health`. Copy its HTTPS service URL, for example `https://campuslink-auth.onrender.com`.
3. In the Expo dashboard, open this EAS project’s **Environment variables** and add `EXPO_PUBLIC_API_URL` with that HTTPS URL in the **preview** environment. This is a public API address, not a secret.
4. Run `npm run build:apk` and install the newly built APK. Registration and login need an internet connection and the deployed API to be healthy.

Do not use real student records until the service is deployed and its security, backups, privacy notice, email verification, and account recovery are production-ready. The included JSON-file store on a persistent disk is a prototype, not a managed database.

The college picker covers known institutions across Khordha district, including Bhubaneswar, Khordha town, Jatni, Banapur, Balugaon, Bolagarh, Balianta, and nearby areas. Names are compiled from Odisha Higher Education Department, SAMS, and SCTE&VT directories. These government directories are separated by course and department and can change, so the picker also accepts a custom college name for institutions that are missing or newly added; it is not an official exhaustive master registry.

## Run in development

From this folder, run:

```bash
npm install
npm start
```

For development, open the project in an Android emulator or use a development client. You do not need Expo Go to install and use the APK built below.

## Build an Android APK

This project is configured to create a standalone, internally distributable APK with EAS Build. The APK runs as its own Android app; Expo Go is not required.

The launcher icon uses the CampusLink brand. Install a newly built APK to see icon changes on your device.

1. Create an Expo account at [expo.dev](https://expo.dev/) if you do not already have one.
2. From this folder, sign in when prompted and start the build:

   ```bash
   npx eas-cli login
   npm run build:apk
   ```

3. When the build finishes, download the APK from the build URL printed by EAS, then transfer it to the Android device and open it to install. Android may ask you to allow installation from that source.

EAS performs this build in the cloud, so a local Android SDK is not needed. The first build may ask to create or link an EAS project.

## Core demo flow: JD → explainable match → skill gap

1. Switch to **Recruiter** and open **Jobs → Post job description**.
2. Enter a company, role title, and a JD containing skills such as React, SQL, Python, Excel, or communication. Tap **Analyze this JD** to review detected requirements; add/edit skills, qualification, and experience before publishing.
3. Tap the role to see every sample student ranked by fit. Each score shows matched and missing skills plus the skills, qualification, experience, and readiness contributions. Shortlisting adds that person to the shared demo pipeline.
4. Choose **Student**, register or log in, and open **Jobs** to see the signed-in student's score, matched skills, gaps, and apply action.
5. Restart the demo and choose **Placement** to review applications, monitor the funnel, support students, and inspect drive schedule clashes.

## Other prototype flows

- Profiles include academics, skills, projects, certifications, internships, aptitude, and readiness.
- Drive calendar supports placement drives, exams, and interviews. It detects overlapping times and blocks conflicting events.
- Inbox collects job, drive, application, and pipeline updates for the relevant role/student.
- Pipeline tracks Applied → Shortlisted → Interview → Offer → Documents → Accepted → Joined, with a Declined/drop-off state.
- Placement view includes stage analytics and early support signals. Support plans can be assigned to students.
- Candidate fit uses a transparent weighted score: skills 65%, qualification 20%, relevant experience 10%, readiness 5%. It does not use names or CGPA in the score, and it never automatically rejects lower scoring students.

## Prototype limits and responsible use

The JD parser is an on-device keyword extractor over a small skills vocabulary. It is a transparent stand-in for AI so the hackathon demo works without credentials; it is not a connected language model. Review extracted skills and qualifications before publishing a role. Placement/recruiter demo actions and sample profiles remain in memory and reset when the app restarts. The local auth API persists student accounts in a private demo data file, but it is not a production service. Keep real student information out of this demo.

git config --global --add safe.directory C:/Users/sunat/Documents/Codex/2026-10-03/th/outputs/CampusLinkMobile
