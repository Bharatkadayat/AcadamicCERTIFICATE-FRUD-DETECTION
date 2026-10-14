import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle,
  GraduationCap,
  Shield,
  Sparkles,
  User
} from "lucide-react";
import { getLandingContent } from "../../utils/landingApi";

const fallbackContent = {
  heroTitle: "FRUD DETECTIONS CERTIFICATES Academic Credential Verification Platform",
  heroSubtitle:
    "Issue, Scanning, store, and verify tamper-proof academic certificates on blockchain with IPFS-backed documents.",
  aboutText:
    "This platform gives admin, institutes, and students a secure role-based workflow for trusted digital credentials.",
  guide: {
    name: "Dr HemaMalini B H",
    title: "Project Guide",
    bio: "On of the most talented and the project guide ,that she help us in the each and the every step of our project , and help us to build the beautiful and the interesting web, as well as the application, that prevent the frud detction the the certification and the spam detection",
    imageUrl: ""
  },
  team: [ 
    { name: "Bharat Bahadur Kadayat", role: "Student Software Developer", email: "", imageUrl: "" },
    { name: "Darshan A B", role: "Student Developer", email: "", imageUrl: "" },
    { name: "Gaurav Nayak K", role: "Student Developer", email: "", imageUrl: "" },
    { name: "Harsha Patil", role: "Student Developer", email: "", imageUrl: "" }
  ]
};

const roleCards = [
  {
    title: "Admin",
    description: "Registers institutes, controls access, and oversees full platform.",
    icon: Shield,
    color: "from-indigo-600 to-blue-600",
    borderColor: "rgb(99, 102, 241)"
  },
  {
    title: "Institute",
    description: "Issues certificates, manages records, and handles revocations.",
    icon: Building2,
    color: "from-cyan-600 to-blue-600",
    borderColor: "rgb(6, 182, 212)"
  },
  {
    title: "Student",
    description: "Views certificates, shares verify links, and keeps profile data.",
    icon: User,
    color: "from-emerald-600 to-cyan-600",
    borderColor: "rgb(16, 185, 129)"
  }
];

const workflows = [
  "Admin registers and activates institute wallets on-chain.",
  "Institute uploads file to IPFS and issues certificate to student wallet.",
  "Certificate data is immutable and verifiable by public certificate ID.",
  "Revocation updates chain state and instantly reflects in all dashboards."
];

const featurePills = [
  "Role-Based Access",
  "IPFS Storage",
  "Tamper Proof",
  "Wallet Signature Login",
  "On-Chain Verification"
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState(fallbackContent);

  useEffect(() => {
    getLandingContent()
      .then((data) => {
        if (data) setContent((prev) => ({ ...prev, ...data }));
      })
      .catch((err) => console.error("Landing content load failed", err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 overflow-x-hidden">
      <style jsx>{`
        @keyframes border-run {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 300% 0%;
          }
        }
        
        @keyframes border-run-reverse {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: -300% 0%;
          }
        }
        
        .animated-border-card {
          position: relative;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          overflow: hidden;
        }
        
        .animated-border-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(59, 130, 246, 0.8), 
            transparent
          );
          background-size: 200% 100%;
          animation: border-run 3s linear infinite;
          border-radius: 1rem;
          z-index: 0;
        }
        
        .animated-border-card::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          right: 2px;
          bottom: 2px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 0.9rem;
          z-index: 1;
        }
        
        .animated-border-card > * {
          position: relative;
          z-index: 2;
        }
        
        /* Admin Card Specific */
        .admin-card::before {
          background: linear-gradient(90deg, 
            transparent, 
            rgba(99, 102, 241, 0.8), 
            rgba(139, 92, 246, 0.8),
            transparent
          );
          background-size: 300% 100%;
          animation: border-run 4s linear infinite;
        }
        
        /* Institute Card Specific */
        .institute-card::before {
          background: linear-gradient(90deg, 
            transparent, 
            rgba(6, 182, 212, 0.8), 
            rgba(59, 130, 246, 0.8),
            transparent
          );
          background-size: 300% 100%;
          animation: border-run 3.5s linear infinite;
        }
        
        /* Student Card Specific */
        .student-card::before {
          background: linear-gradient(90deg, 
            transparent, 
            rgba(16, 185, 129, 0.8), 
            rgba(6, 182, 212, 0.8),
            transparent
          );
          background-size: 300% 100%;
          animation: border-run 4.5s linear infinite;
        }
        
        /* Stats Card */
        .stats-card::before {
          background: linear-gradient(90deg, 
            transparent, 
            rgba(59, 130, 246, 0.6), 
            rgba(139, 92, 246, 0.6),
            transparent
          );
          background-size: 300% 100%;
          animation: border-run 5s linear infinite;
        }
        
        /* About Card */
        .about-card::before {
          background: linear-gradient(90deg, 
            transparent, 
            rgba(6, 182, 212, 0.7), 
            rgba(59, 130, 246, 0.7),
            transparent
          );
          background-size: 300% 100%;
          animation: border-run-reverse 4s linear infinite;
        }
        
        /* Team Card */
        .team-card::before {
          background: linear-gradient(90deg, 
            transparent, 
            rgba(16, 185, 129, 0.6), 
            rgba(6, 182, 212, 0.6),
            transparent
          );
          background-size: 300% 100%;
          animation: border-run 3s linear infinite;
        }
        
        .team-card:hover::before {
          animation-duration: 1.5s;
        }
        
        .animated-border-card:hover::before {
          animation-duration: 1.5s;
        }
      `}</style>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[46rem] h-[46rem] border border-cyan-200/70 rounded-full animate-spin-slow" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] border border-blue-200/80 rounded-full animate-spin-slow" style={{ animationDirection: "reverse" }} />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(90deg,rgba(14,116,144,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(14,116,144,.08)_1px,transparent_1px)] [background-size:42px_42px]" />
      </div>

      <nav className="bg-white/50 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center animate-pulse-glow">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
              EduBlockchain
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/site-content")} className="soft-button-muted text-sm">
              Manage Site
            </button>
            <button onClick={() => navigate("/login")} className="soft-button-primary text-sm">
              Connect Wallet
            </button>
          </div>
        </div>
      </nav>

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center max-w-4xl mx-auto">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Blockchain + IPFS + Role-Based Security
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold hero-title-animated leading-tight">
            {content.heroTitle}
          </h1>
          <p className="text-slate-600 text-lg mt-6">{content.heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button onClick={() => navigate("/login")} className="soft-button-primary px-8 py-3">
              Start Platform
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate("/verify")} className="soft-button-muted px-8 py-3">
              Verify Certificate
            </button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {featurePills.map((pill) => (
              <span key={pill} className="px-3 py-1 text-xs rounded-full bg-white/70 border border-cyan-100 text-slate-700">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Cards with Animated Border */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="animated-border-card stats-card p-4">
            <p className="text-xs text-slate-500">Network</p>
            <p className="text-lg font-bold text-slate-900">EVM Compatible</p>
          </div>
          <div className="animated-border-card stats-card p-4">
            <p className="text-xs text-slate-500">Storage Layer</p>
            <p className="text-lg font-bold text-slate-900">IPFS / Pinata</p>
          </div>
          <div className="animated-border-card stats-card p-4">
            <p className="text-xs text-slate-500">Verification</p>
            <p className="text-lg font-bold text-slate-900">Public + Real-Time</p>
          </div>
        </div>
      </section>

      {/* Role Cards with Animated Borders */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="animated-border-card admin-card p-6 cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => navigate("/login")}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${roleCards[0].color} flex items-center justify-center mb-4`}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Admin</h3>
            <p className="text-slate-600 mt-2">Registers institutes, controls access, and oversees full platform.</p>
          </div>
          
          <div className="animated-border-card institute-card p-6 cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => navigate("/login")}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${roleCards[1].color} flex items-center justify-center mb-4`}>
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Institute</h3>
            <p className="text-slate-600 mt-2">Issues certificates, manages records, and handles revocations.</p>
          </div>
          
          <div className="animated-border-card student-card p-6 cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => navigate("/login")}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${roleCards[2].color} flex items-center justify-center mb-4`}>
              <User className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Student</h3>
            <p className="text-slate-600 mt-2">Views certificates, shares verify links, and keeps profile data.</p>
          </div>
        </div>
      </section>

      {/* About and Workflow Cards */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animated-border-card about-card p-6">
            <h2 className="text-2xl font-bold text-slate-900">About Us</h2>
            <p className="text-slate-600 mt-3">{content.aboutText}</p>
          </div>
          <div className="animated-border-card about-card p-6">
            <h2 className="text-2xl font-bold text-slate-900">Core Workflow</h2>
            <div className="mt-3 space-y-2">
              {workflows.map((item, idx) => (
                <p key={idx} className="text-sm text-slate-600 inline-flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Guide Card */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animated-border-card about-card p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 inline-flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-600" />
            Guide / Mentor
          </h2>
          <div className="mt-4 flex flex-col md:flex-row items-start md:items-center gap-4">
            {content.guide?.imageUrl ? (
              <img src={content.guide.imageUrl} alt={content.guide.name} className="w-24 h-24 rounded-xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 border border-cyan-200 flex items-center justify-center text-slate-500">
                Guide
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-slate-900">{content.guide?.name || "Dr HemaMalini B H"}</p>
              <p className="text-sm text-slate-600">{content.guide?.title || "Project Guide"}</p>
              {content.guide?.bio ? <p className="text-sm text-slate-600 mt-1">{content.guide.bio}</p> : null}
            </div>
          </div>
        </div>
      </section>

      {/* Team Cards */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(content.team || []).map((member, idx) => (
            <div key={`${member.name}-${idx}`} className="animated-border-card team-card p-4">
              {member.imageUrl ? (
                <img src={member.imageUrl} alt={member.name} className="w-16 h-16 rounded-lg object-cover mb-3" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 border border-cyan-200 mb-3 flex items-center justify-center">
                  <User className="w-8 h-8 text-cyan-600" />
                </div>
              )}
              <p className="font-semibold text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-600">{member.role}</p>
              {member.email ? <p className="text-xs text-slate-500 break-all mt-1">{member.email}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-gray-200 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-slate-500">
          {"\u00A9"} 2026 EduBlockchain. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;