import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaShieldAlt, FaEnvelope, FaBuilding } from "react-icons/fa";
import { motion } from "framer-motion";
import ThemeToggle from "../theme/ThemeToggle"; 

// --- Configuration ---
export const EFFECTIVE_DATE = "December 25, 2025"; 
export const LAST_MODIFIED = "December 25, 2025"; 

// --- Env Variables ---
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL;
const CONTACT_EMAIL_2 = import.meta.env.VITE_CONTACT_EMAIL_2;
const CONTACT_EMAIL_3 = import.meta.env.VITE_CONTACT_EMAIL_3;
const TRANSCRIPTION_POLICY_URL = import.meta.env.VITE_TRANSCRIPTION_PROVIDER_PRIVACY_POLICY_URL;
const GOOGLE_POLICY_URL = import.meta.env.VITE_GOOGLE_FORM_PRIVACY_POLICY_URL;

const PrivacyPolicy = ({ isModal = false }) => {
  
  useEffect(() => {
    if (!isModal) {
      window.scrollTo(0, 0);
    }
  }, [isModal]);
  
  const linkClasses = "text-[#1D3C87] dark:text-blue-400 underline decoration-dotted hover:decoration-solid";
  
  // Privacy Policy Content (shared between modal and full page)
  const PolicyContent = () => (
    <div className={isModal ? "text-sm" : "prose prose-lg prose-slate dark:prose-invert max-w-none"} style={{ textAlign: 'justify' }}>
      
      <Section title="1. Introduction" isModal={isModal}>
        <p className={isModal ? "" : "mb-4"}>
          This Privacy Policy governs your use of QUAiL (accessible at <a href="https://quail.edarts.online/" target="_blank" rel="noreferrer" className={linkClasses}>https://quail.edarts.online/</a>), a web-based qualitative data analysis tool that forms part of the <a href="https://edarts.online/" target="_blank" rel="noreferrer" className={linkClasses}>Educational Data Analytics Research Tools (EDART)</a> ecosystem.
          Throughout this policy, the terms "we," "us," and "our" refer to the Centre for Educational Technology (CET) at IIT Bombay, the institution responsible for developing and maintaining the EDART ecosystem.
        </p>
        <p>
          We are committed to protecting your privacy and ensuring the transparency of our data practices. QUAiL is an open-source academic tool designed for research purposes and is not a commercial product; therefore, <strong>we do not sell your personal data to third parties.</strong> This document explains what information we collect, how we use it, and the technical safeguards we have implemented to secure your data.
        </p>
      </Section>

      <Section title="2. Information We Collect" isModal={isModal}>
        <p>We collect only the information necessary to provide you with the analysis functionality, secure your account, and maintain the application's integrity. Based on our system architecture, this includes:</p>
        
        <Subsection title="A. Personal Information" isModal={isModal}>
          <p>When you register for an account, we collect the following:</p>
          <ul className={`list-disc pl-5 ${isModal ? 'space-y-1 mt-1' : 'space-y-2 mt-2'}`}>
            <li><strong>Name:</strong> To identify your user profile.</li>
            <li><strong>Email Address:</strong> Used for unique identification, login credential, account verification, and password resets. We may also use your email address to send important notifications regarding data migration, privacy policy updates, or upcoming server maintenance.</li>
            <li><strong>Password:</strong> Collected to secure your account and authenticate your access during login.</li>
          </ul>
        </Subsection>

        <Subsection title="B. User Content (Project Data)" isModal={isModal}>
          <p>To facilitate qualitative analysis, the application stores the data you actively upload or create:</p>
          <ul className={`list-disc pl-5 ${isModal ? 'space-y-1 mt-1' : 'space-y-2 mt-2'}`}>
            <li><strong>Uploaded Files:</strong> Text documents uploaded for analysis.</li>
            <li><strong>Transcripts:</strong> Text generated from audio files or manually entered via the editor during edit mode.</li>
            <li><strong>Analysis Data:</strong> Code Definitions, Coded Segments, Memos, and Inline Highlights created within the application.</li>
          </ul>
        </Subsection>

        <Subsection title="C. Technical Credentials" isModal={isModal}>
          <p><strong>Third-Party API Keys:</strong> If you choose to use the "Bring Your Own Key" (BYOK) feature for external services (specifically AssemblyAI for transcription), we store your personal API key.</p>
          
          <div className={`${isModal ? 'my-2 text-xs' : 'my-4'} pl-4 border-l-2 border-gray-300 dark:border-gray-700 italic text-gray-600 dark:text-gray-400`}>
            <p className={isModal ? "mb-1" : "mb-2"}>We encrypt your API key to ensure it is never stored in plain text in our database.</p>
            <p className={isModal ? "mb-1" : "mb-2"}>However, to enable the transcription service to function, our system must be able to decrypt your key. Therefore, we possess the encryption key required to perform this decryption.</p>
            <p>We adhere to strict ethical guidelines to ensure this encryption key is managed securely and never misused to access your credentials for unauthorized purposes.</p>
          </div>
          
          <p>For details on how the transcription provider handles your data, please refer to the <a href={TRANSCRIPTION_POLICY_URL} target="_blank" rel="noreferrer" className="text-[#1D3C87] dark:text-blue-400 hover:underline">AssemblyAI Privacy Policy</a>.</p>
        </Subsection>

        <Subsection title="D. Usage Data" isModal={isModal}>
          <ul className={`list-disc pl-5 ${isModal ? 'space-y-1' : 'space-y-2'}`}>
            <li><strong>Site Statistics:</strong> We track aggregate, non-personally identifiable metrics, specifically the total number of registered users and the cumulative count of site visits, to monitor application usage.</li>
          </ul>
        </Subsection>
      </Section>

      <Section title="3. How We Use Information" isModal={isModal}>
        <p>We use your information strictly for the following purposes:</p>
        <ul className={`list-disc pl-5 ${isModal ? 'space-y-1 mt-1' : 'space-y-2 mt-2'}`}>
          <li><strong>Service Provision:</strong> To create and manage your projects, store your analysis data, allow you to edit and export your work, perform statistical calculations (e.g., Chi-Square tests), and enable features such as the audio player for playback and seeking.</li>
          <li><strong>Authentication:</strong> To verify your identity, manage sessions via JSON Web Tokens (JWT), and handle password resets.</li>
          <li>
            <strong>Transcription Services:</strong> If you provide an API key, we use it to authenticate requests to the third-party provider for transcription.
          </li>
          <li><strong>Communication:</strong> We use your email to send account verification links and password reset instructions. We may also use your email address to send important notifications regarding data migration, privacy policy updates, or upcoming server maintenance.</li>
        </ul>
        <p className={`font-bold ${isModal ? 'mt-2' : 'mt-4'} text-[#132142] dark:text-white`}>We do not sell, rent, or trade your personal information or research data.</p>
      </Section>

      <Section title="4. Data Storage and Security" isModal={isModal}>
        <Subsection title="A. Database Storage (Persistent)" isModal={isModal}>
          <p><strong>MongoDB:</strong> All user profiles, project metadata, analysis data (codes, memos), and processed text content are stored persistently in our MongoDB database. We do not retain backups or copies of this data once you delete it.</p>
        </Subsection>

        <Subsection title="B. Disk Storage (Temporary & Ephemeral)" isModal={isModal}>
          <p>Our server's disk storage is used primarily as a temporary workspace for data processing. We do not intentionally use the disk for permanent data storage.</p>
          <ul className={`list-disc pl-5 ${isModal ? 'space-y-1 mt-1' : 'space-y-2 mt-2'}`}>
            <li><strong>Document Parsing:</strong> When you upload text (e.g., .pdf or .docx files) or project files (e.g., .quail Archive), the disk is used temporarily to unzip, extract, and parse the content so it can be saved to the MongoDB database. Once processing is complete, these files are automatically deleted.</li>
            <li><strong>Audio Files:</strong> Audio files are stored on the disk temporarily to enable the audio player features (playback and seek) within the "Edit Mode" of the application. These audio files are permanently deleted from the disk as soon as you lock the file.</li>
          </ul>
          
          <div className={`${isModal ? 'mt-2 p-3 text-xs' : 'mt-4 p-4'} bg-gray-100 dark:bg-gray-800 rounded-lg`}>
            <p><strong>Automated Cleanup:</strong> Occasionally, technical difficulties like network interruptions, parsing errors, or refreshing/closing the tab mid-upload can leave behind incomplete data fragments (residual files) on our server. To ensure that your data is never permanently stored, even by accident, we enforce rigorous automated cleanup protocols:</p>
            <ul className={`list-disc pl-5 ${isModal ? 'mt-1' : 'mt-2'}`}>
              <li><strong>Hourly Maintenance (Runs every hour): </strong>Permanently removes accidental left over data from interrupted project (.quail Archive) extraction or parsing.</li>
              <li><strong>Daily Deep Clean (Runs every 24 hours): </strong>Scans for residual files from interrupted audio uploads and permanently deletes them.</li>
            </ul>
          </div>
        </Subsection>

        <Subsection title="C. Encryption & Data Visibility" isModal={isModal}>
          <p>To be fully transparent about our security architecture:</p>
          <ul className={`list-disc pl-5 ${isModal ? 'space-y-1 mt-1' : 'space-y-2 mt-2'}`}>
            <li><strong>Credentials:</strong> Passwords are hashed and third-party API keys are encrypted before storage, ensuring sensitive data is never stored in plain text.</li>
            <li><strong>Imported Files:</strong> Your transcripts, uploaded text documents, and temporary audio files are stored in our database and server storage in their original, unencrypted format.</li>
            <div className={`${isModal ? 'my-2 text-xs' : 'my-4'} pl-4 border-l-2 border-gray-300 dark:border-gray-700 italic text-gray-600 dark:text-gray-400`}>
                <p className={isModal ? "mb-1" : "mb-2"}>Access to this data is strictly controlled through application-level authentication, ensuring that only authenticated users can access their own projects.</p>
                <p className={isModal ? "mb-1" : "mb-2"}>Administrative access to databases and server infrastructure is limited to authorized personnel. These individuals adhere to ethical guidelines and confidentiality standards to guarantee your data privacy and prevent any misuse.</p>
          </div>
          </ul>
        </Subsection>
      </Section>

      <Section title="5. Third-Party Services" isModal={isModal}>
        <p>QUAiL integrates with specific third-party services to enhance functionality.</p>
        <ul className={`list-disc pl-5 ${isModal ? 'space-y-1 mt-1' : 'space-y-2 mt-2'}`}>
          <li><strong>AssemblyAI:</strong> Used for automated audio transcription. Data is shared with them only if you explicitly provide your own API key and upload an audio file. Please review the <a href={TRANSCRIPTION_POLICY_URL} target="_blank" rel="noreferrer" className="text-[#1D3C87] dark:text-blue-400 hover:underline">AssemblyAI Privacy Policy</a>.</li>
          <li><strong>Google Forms:</strong> We use external Google Forms for bug reporting and general feedback. Any data you enter there is governed by <a href={GOOGLE_POLICY_URL} target="_blank" rel="noreferrer" className="text-[#1D3C87] dark:text-blue-400 hover:underline">Google's Privacy Policy</a>.</li>
          <li><strong>Email Services:</strong> We use a secure SMTP provider to send system emails (verification, password resets, and critical updates regarding data migration, policy changes, or maintenance).</li>
        </ul>
      </Section>

      <Section title="6. User Rights" isModal={isModal}>
        <p>As a user of QUAiL, you have full control over your data:</p>
        <ul className={`list-disc pl-5 ${isModal ? 'space-y-1 mt-1' : 'space-y-2 mt-2'}`}>
          <li><strong>Access and Correction:</strong> You are free to edit or change any of your project data (codes, text, memos) at any time, provided the specific file is not in a locked state.</li>
          <li>
            <strong>Data Portability:</strong> You can export your data in various formats:
            <ul className={`list-[circle] pl-6 mt-1 space-y-1 text-gray-600 dark:text-gray-400 ${isModal ? 'text-xs' : 'text-sm'}`}>
              <li><strong>Excel:</strong> Coded segments, code definitions, and memos.</li>
              <li><strong>PDF/Word:</strong> Imported text files.</li>
              <li><strong>PDF:</strong> Statistical analysis reports.</li>
              <li><strong>PNG:</strong> Data visualizations and charts.</li>
              <li><strong>.quail Archive:</strong> A full backup of your project for transfer or storage.</li>
            </ul>
          </li>
          <li>
            <strong>Deletion:</strong>
            <ul className={`list-[circle] pl-6 mt-1 space-y-1 text-gray-600 dark:text-gray-400 ${isModal ? 'text-xs' : 'text-sm'}`}>
              <li><strong>Delete Projects/Files:</strong> You can permanently delete individual imported files or entire projects, including all associated codes, memos, and annotations.</li>
              <li><strong>Delete Account:</strong> You may securely delete your account and all associated data yourself directly through the application interface.</li>
              <li><strong>Permanent Erasure:</strong> When you delete data (files, projects, or your account), it is completely erased from our database and disk. We do not retain copies or backups of deleted user data.</li>
            </ul>
          </li>
          <li>
            <strong>Full User-Controlled Data Lifecycle:</strong>
                <ul className={`list-[circle] pl-6 mt-1 space-y-1 text-gray-600 dark:text-gray-400 ${isModal ? 'text-xs' : 'text-sm'}`}>
                    <li>QUAiL allows you to maintain complete control over the lifecycle of your data. You may conduct your analysis on the platform, export all outputs or back up your entire project as a <strong>.quail Archive</strong> for local storage, and then permanently remove your data from QUAiL. All deleted data is irreversibly erased from our systems.</li>
                </ul>
          </li>
        </ul>
      </Section>

      {!isModal && (
        <Section title="7. Contact Information" isModal={isModal}>
          <p className="mb-4">If you have any questions about this Privacy Policy, please contact the development team at:</p>
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-12 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex gap-4">
                  <div className="text-[#F05623] mt-1 shrink-0"><FaBuilding size={20} /></div>
                  <div className="text-sm">
                      <strong className="block text-gray-900 dark:text-white text-base mb-1">Centre for Educational Technology (CET)</strong>
                      Indian Institute of Technology Bombay<br />
                      Powai, Mumbai 400076,<br />
                      Maharashtra, India
                  </div>
              </div>
              <div className="flex gap-4">
                  <div className="text-[#1D3C87] dark:text-blue-400 mt-1 shrink-0"><FaEnvelope size={20} /></div>
                  <div className="text-sm break-all">
                      <strong className="block text-gray-900 dark:text-white text-base mb-1">Email Us</strong>
                      <div className="flex flex-col gap-1">
                        <a href={`mailto:${CONTACT_EMAIL_3}`} className="hover:text-[#F05623] transition-colors">{CONTACT_EMAIL_3}</a>
                        <a href={`mailto:${CONTACT_EMAIL_2}`} className="hover:text-[#F05623] transition-colors">{CONTACT_EMAIL_2}</a>
                        <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[#F05623] transition-colors">{CONTACT_EMAIL}</a>
                      </div>
                      <br />
                  </div>
              </div>
          </div>
        </Section>
      )}
    </div>
  );
  
  // If rendering in modal, skip the header/nav and outer container
  if (isModal) {
    return (
      <div className="px-4 py-2">
        {/* Title Block for modal */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 border-l-4 border-[#F05623] pl-4 mt-2"
        >
          <h1 className="text-2xl font-extrabold text-[#132142] dark:text-white mb-1">
            Privacy Policy
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
            Effective Date: <span className="text-gray-800 dark:text-gray-200">{EFFECTIVE_DATE}</span> <br />
            Last Modified: <span className="text-gray-800 dark:text-gray-200">{LAST_MODIFIED}</span>
          </p>
        </motion.div>

        <PolicyContent />
      </div>
    );
  }
  
  // Regular full-page render
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-300 font-sans selection:bg-[#F05623]/30 transition-colors duration-300 relative">
      
      {/* --- Top Right Toggle (Fixed Position) --- */}
      <div className="fixed top-4 right-4 z-[60]">
        <ThemeToggle navbar={false} />
      </div>

      {/* Header / Nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2 group">
                  <div className="p-2 rounded-full bg-slate-100 dark:bg-gray-800 group-hover:bg-[#F05623]/10 transition-colors">
                    <FaArrowLeft className="text-gray-600 dark:text-gray-400 group-hover:text-[#F05623]" />
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-[#F05623] transition-colors hidden sm:inline">
                    Home
                  </span>
                </Link>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block"></div>
              </div>
          <div className="font-bold text-xl text-[#132142] dark:text-white flex items-center gap-2 pr-12 md:pr-0">
            <FaShieldAlt className="text-[#F05623]" />
            <span className="hidden sm:inline">QUAiL Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        
        {/* Title Block */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 border-l-4 border-[#F05623] pl-6"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#132142] dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider font-semibold">
            Effective Date: <span className="text-gray-800 dark:text-gray-200">{EFFECTIVE_DATE}</span> <br />
            Last Modified: <span className="text-gray-800 dark:text-gray-200">{LAST_MODIFIED}</span>
          </p>
        </motion.div>

        {/* Legal Text Content */}
        <PolicyContent />
        
        {/* Footer of Policy */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500">
          <p>
            Copyright © {new Date().getFullYear()}
            <a
              href="https://edarts.online/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
            >
              {' '}Educational Data Analytics Research Tools (EDART)
            </a>
            .
          </p>
          <p className="text-xs mt-1 opacity-70">All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

// Helper for consistent section spacing and headers
const Section = ({ title, children, isModal = false }) => (
  <section className={isModal ? "mb-8" : "mb-10 lg:mb-14"}>
    <h2 className={`font-bold text-[#132142] dark:text-white pb-2 ${isModal ? 'text-xl mb-3 border-b border-gray-200 dark:border-gray-700' : 'text-2xl mb-4 border-b border-gray-200 dark:border-gray-800'}`}>
        {title}
    </h2>
    <div className={`text-gray-700 dark:text-gray-300 leading-relaxed ${isModal ? 'space-y-3' : 'space-y-4'}`}>
        {children}
    </div>
  </section>
);

const Subsection = ({ title, children, isModal = false }) => (
  <div className={isModal ? "mt-4 mb-3" : "mt-6 mb-4"}>
     <h4 className={`font-bold text-[#132142] dark:text-gray-200 ${isModal ? 'text-base mb-1' : 'text-lg mb-2'}`}>{title}</h4>
     <div className="text-gray-700 dark:text-gray-300">
       {children}
     </div>
  </div>
);

export default PrivacyPolicy;