import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";

import {
  Upload,
  FileText,
  User,
  BookOpen,
  Award,
  Loader,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Search,
  Sparkles
} from "lucide-react";

import {
  issueCertificate,
  isActiveInstitute,
  getInstituteBasicInfo
} from "../../utils/contract";

import { uploadToIPFS, generateFileHash } from "../../utils/ipfs";

// Predefined course list
const COURSE_LIST = [
  "Computer Science Engineering (CSE)",
  "Artificial Intelligence & ML (AIML)",
  "Information Science (ISE)",
  "Electronics & Communication (ECE)",
  "Electrical Engineering (EEE)",
  "Mechanical Engineering (MECH)",
  "Civil Engineering (CIVIL)",
  "Chemical Engineering",
  "Biotechnology",
  "Aerospace Engineering",
  "Automobile Engineering",
  "Robotics Engineering",
  "Data Science",
  "Cyber Security",
  "Cloud Computing",
  "Blockchain Technology",
  "Internet of Things (IoT)",
  "Full Stack Development",
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "Big Data Analytics",
  "MBA Finance",
  "MBA Marketing",
  "MBA HR",
  "BCA Computer Application",
  "MCA Master of Computer Apps",
  "Diploma in Computer Science",
  "Diploma in Electronics"
];

// Semester options
const SEMESTERS = [
  "Semester 1",
  "Semester 2",
  "Semester 3",
  "Semester 4",
  "Semester 5",
  "Semester 6",
  "Semester 7",
  "Semester 8"
];

const UploadCertificate = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [warning, setWarning] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDetails, setFileDetails] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCourseDropdown, setShowCourseDropdown] = useState({});
  const [showSemesterDropdown, setShowSemesterDropdown] = useState({});

  const [skills, setSkills] = useState([]);
  const [currentSkill, setCurrentSkill] = useState("");

  const [formData, setFormData] = useState({
    studentName: "",
    studentId: "",
    studentWallet: "",
    grade: "",
    credits: "",
    duration: ""
  });

  useEffect(() => {
    verifyInstitute();
  }, []);

  const verifyInstitute = async () => {
    try {
      const active = await isActiveInstitute();
      if (!active) {
        setError("Your institute is not active");
        return;
      }
      setLoading(false);
    } catch (err) {
      setError("Institute verification failed");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSelectedFiles(files);
    
    const details = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const hash = await generateFileHash(file);
      details.push({
        id: i,
        file: file,
        fileHash: hash,
        courseName: "",
        semester: "",
        status: "pending",
        ipfsHash: "",
        txHash: "",
        certificateId: "",
        errorMessage: ""
      });
    }
    setFileDetails(details);
  };

  const updateFileCourse = (id, courseName) => {
    setFileDetails(prev => prev.map(detail => 
      detail.id === id ? { ...detail, courseName } : detail
    ));
    setShowCourseDropdown(prev => ({ ...prev, [id]: false }));
  };

  const updateFileSemester = (id, semester) => {
    setFileDetails(prev => prev.map(detail => 
      detail.id === id ? { ...detail, semester } : detail
    ));
    setShowSemesterDropdown(prev => ({ ...prev, [id]: false }));
  };

  const toggleCourseDropdown = (id) => {
    setShowCourseDropdown(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSemesterDropdown = (id) => {
    setShowSemesterDropdown(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-generate unique course names with different semesters based on pattern
  const autoGenerateCourseNames = () => {
    if (fileDetails.length === 0) {
      setError("Please upload files first");
      return;
    }

    const updated = fileDetails.map((detail, idx) => {
      // Cycle through semesters: 1,2,3,4,5,6,7,8,1,2,3...
      const semesterIndex = idx % SEMESTERS.length;
      const semester = SEMESTERS[semesterIndex];
      
      // Default course if none selected
      const baseCourse = "Computer Science Engineering (CSE)";
      
      return {
        ...detail,
        courseName: `${baseCourse} - ${semester} - Photo ${idx + 1}`,
        semester: semester
      };
    });
    
    setFileDetails(updated);
    setWarning(null);
    setSuccess({
      message: `✅ Auto-generated unique names for ${updated.length} file(s) with rotating semesters!`
    });
    
    // Show which semesters were assigned
    const semesterCount = {};
    updated.forEach(d => {
      semesterCount[d.semester] = (semesterCount[d.semester] || 0) + 1;
    });
    
    console.log("Semester distribution:", semesterCount);
    
    setTimeout(() => setSuccess(null), 4000);
  };

  // Auto-generate with specific course
  const autoGenerateWithCourse = (course) => {
    if (fileDetails.length === 0) {
      setError("Please upload files first");
      return;
    }

    const updated = fileDetails.map((detail, idx) => {
      const semesterIndex = idx % SEMESTERS.length;
      const semester = SEMESTERS[semesterIndex];
      
      return {
        ...detail,
        courseName: `${course} - ${semester} - Photo ${idx + 1}`,
        semester: semester
      };
    });
    
    setFileDetails(updated);
    setSuccess({
      message: `✅ Auto-generated ${updated.length} names with ${course} and rotating semesters!`
    });
    
    setTimeout(() => setSuccess(null), 3000);
  };

  const addSkill = () => {
    const skill = currentSkill.trim();
    if (!skill) {
      setError("Enter a skill before adding");
      return;
    }
    if (skills.includes(skill)) {
      setError("Skill already added");
      return;
    }
    setError(null);
    setSkills([...skills, skill]);
    setCurrentSkill("");
  };

  const removeSkill = (skill) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const processSingleFile = async (fileDetail, index, total) => {
    try {
      setFileDetails(prev => prev.map(detail =>
        detail.id === fileDetail.id 
          ? { ...detail, status: "processing" } 
          : detail
      ));

      console.log(`[${index + 1}/${total}] Processing: ${fileDetail.file.name}`);
      console.log(`[${index + 1}/${total}] Course: ${fileDetail.courseName}`);

      const ipfs = await uploadToIPFS(fileDetail.file);
      console.log(`[${index + 1}/${total}] IPFS: ${ipfs.IpfsHash}`);

      const result = await issueCertificate(
        formData.studentName,
        fileDetail.courseName,
        ipfs.IpfsHash,
        fileDetail.fileHash,
        formData.studentWallet,
        formData.studentId || "",
        formData.grade || "",
        Number(formData.credits || 0),
        formData.duration || "",
        skills
      );

      setFileDetails(prev => prev.map(detail =>
        detail.id === fileDetail.id 
          ? { 
              ...detail, 
              status: "success",
              ipfsHash: ipfs.IpfsHash,
              txHash: result.hash,
              certificateId: result.certificateId
            } 
          : detail
      ));

      return {
        success: true,
        fileName: fileDetail.file.name,
        course: fileDetail.courseName,
        semester: fileDetail.semester,
        ipfsHash: ipfs.IpfsHash,
        txHash: result.hash,
        certificateId: result.certificateId
      };

    } catch (err) {
      console.error(`[${index + 1}/${total}] Error:`, err);
      
      let errorMsg = String(err?.reason || err?.data?.message || err?.message || "");
      if (errorMsg.toLowerCase().includes("student already has certificate")) {
        errorMsg = `❌ Student already has a certificate for "${fileDetail.courseName}". Each certificate needs a unique name.`;
      }
      
      setFileDetails(prev => prev.map(detail =>
        detail.id === fileDetail.id 
          ? { 
              ...detail, 
              status: "error",
              errorMessage: errorMsg
            } 
          : detail
      ));

      return {
        success: false,
        fileName: fileDetail.file.name,
        course: fileDetail.courseName,
        error: errorMsg
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (selectedFiles.length === 0) {
        throw new Error("Please upload certificate files");
      }

      if (!ethers.utils.isAddress(formData.studentWallet)) {
        throw new Error("Invalid student wallet address");
      }

      if (!formData.studentName.trim()) {
        throw new Error("Student name is required");
      }

      const missingCourse = fileDetails.some(detail => !detail.courseName.trim());
      if (missingCourse) {
        throw new Error("Please enter a course name for each certificate file");
      }

      const courses = fileDetails.map(detail => detail.courseName.trim());
      const duplicateCourses = courses.filter((course, index) => courses.indexOf(course) !== index);
      
      if (duplicateCourses.length > 0) {
        throw new Error(`Duplicate course names: ${duplicateCourses.join(", ")}. Each certificate needs a unique name.`);
      }

      const confirmMessage = `Issue ${fileDetails.length} Certificate(s)?\n\n` +
        `Student: ${formData.studentName}\n` +
        `Student ID: ${formData.studentId || 'N/A'}\n` +
        `Wallet: ${formData.studentWallet.slice(0, 6)}...${formData.studentWallet.slice(-4)}\n\n` +
        `Certificates:\n${fileDetails.map(d => `  • ${d.file.name} → ${d.courseName}`).join('\n')}\n\n` +
        `⚠️ Each will have its own transaction. Proceed?`;
      
      if (!window.confirm(confirmMessage)) {
        setSubmitting(false);
        return;
      }

      const results = [];
      for (let i = 0; i < fileDetails.length; i++) {
        const result = await processSingleFile(fileDetails[i], i + 1, fileDetails.length);
        results.push(result);
        if (i < fileDetails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        setSuccess({
          total: successCount,
          failed: failCount,
          certificates: results.filter(r => r.success)
        });

        setTimeout(() => {
          navigate("/institute/success", {
            state: {
              studentName: formData.studentName,
              certificatesCount: successCount,
              certificates: results.filter(r => r.success)
            }
          });
        }, 3000);
      } else {
        throw new Error("All certificates failed to issue.");
      }

    } catch (err) {
      console.error(err);
      const msg = String(err?.reason || err?.data?.message || err?.message || "");
      setError(msg || "Failed to issue certificates");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2">
        <Award className="w-8 h-8 text-blue-600" />
        Issue Multiple Certificates
      </h1>

      {success && !success.certificates && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
          <CheckCircle className="text-green-600 mb-2 w-6 h-6" />
          <p className="text-emerald-800">{success.message}</p>
        </div>
      )}

      {success && success.certificates && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
          <CheckCircle className="text-green-600 mb-2 w-6 h-6" />
          <p className="font-semibold text-emerald-800">
            ✅ {success.total} certificate(s) issued successfully!
            {success.failed > 0 && ` (${success.failed} failed)`}
          </p>
          <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
            {success.certificates.map((cert, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-emerald-200">
                <p className="font-medium text-sm">📄 {cert.fileName}</p>
                <p className="text-sm text-blue-600">Course: {cert.course}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Certificate ID: {cert.certificateId}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 mb-4 flex items-start gap-2">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="whitespace-pre-line">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* STUDENT INFORMATION */}
        <div className="border-b pb-3">
          <h2 className="font-semibold mb-3 flex items-center text-lg">
            <User className="w-5 h-5 mr-2" />
            Student Information
          </h2>
          <input
            name="studentName"
            placeholder="Student Name *"
            value={formData.studentName}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            name="studentId"
            placeholder="Student ID / USN"
            value={formData.studentId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
          />
          <input
            name="studentWallet"
            placeholder="Student Wallet Address *"
            value={formData.studentWallet}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            required
          />
        </div>

        {/* COMMON DETAILS */}
        <div className="border-b pb-3">
          <h2 className="font-semibold mb-3 flex items-center text-lg">
            <BookOpen className="w-5 h-5 mr-2" />
            Common Certificate Details
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="grade"
              placeholder="Grade"
              value={formData.grade}
              onChange={handleInputChange}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              name="credits"
              placeholder="Credits"
              value={formData.credits}
              onChange={handleInputChange}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <input
            name="duration"
            placeholder="Duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* SKILLS */}
        <div className="border-b pb-3">
          <h2 className="font-semibold mb-3 flex items-center text-lg">
            <Award className="w-5 h-5 mr-2" />
            Skills
          </h2>
          <div className="flex space-x-2">
            <input
              value={currentSkill}
              onChange={(e) => setCurrentSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              placeholder="Add a skill"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {skills.map(skill => (
              <span key={skill} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* FILES SECTION */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center text-lg">
            <FileText className="w-5 h-5 mr-2" />
            Certificate Files
          </h2>
          
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            accept=".pdf,.jpg,.jpeg,.png"
          />

          {selectedFiles.length > 0 && (
            <div className="mt-4">
              {/* Auto-Generate Buttons */}
              <div className="mb-4 space-y-2">
                <button
                  type="button"
                  onClick={autoGenerateCourseNames}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Auto-Generate (Rotating Semesters)
                </button>
                
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {COURSE_LIST.slice(0, 6).map(course => (
                    <button
                      key={course}
                      type="button"
                      onClick={() => autoGenerateWithCourse(course)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 whitespace-nowrap"
                    >
                      {course.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  💡 Semesters rotate: Photo 1→Sem1, Photo 2→Sem2, Photo 3→Sem3... Photo 9→Sem1 again
                </p>
              </div>
              
              <p className="text-sm font-semibold mb-2">
                📁 {selectedFiles.length} file(s) selected
              </p>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {fileDetails.map((detail) => {
                  return (
                    <div
                      key={detail.id}
                      className={`border rounded-lg p-3 ${
                        detail.status === "success" ? "bg-green-50 border-green-200" :
                        detail.status === "error" ? "bg-red-50 border-red-200" :
                        detail.status === "processing" ? "bg-blue-50 border-blue-200" :
                        "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {detail.status === "processing" && <Loader className="w-5 h-5 text-blue-500 animate-spin mt-1" />}
                        {detail.status === "success" && <CheckCircle className="w-5 h-5 text-green-500 mt-1" />}
                        {detail.status === "error" && <XCircle className="w-5 h-5 text-red-500 mt-1" />}
                        {detail.status === "pending" && <FileText className="w-5 h-5 text-gray-500 mt-1" />}
                        
                        <div className="flex-1">
                          <p className="text-sm font-medium">{detail.file.name}</p>
                          <p className="text-xs text-gray-500 mb-2">
                            Size: {(detail.file.size / 1024).toFixed(1)} KB
                          </p>
                          
                          {/* Course Name Input with Dropdown */}
                          <div className="mb-2">
                            <label className="text-xs font-medium text-gray-700">Course Name *</label>
                            <div className="relative mt-1">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Enter course name"
                                  value={detail.courseName}
                                  onChange={(e) => updateFileCourse(detail.id, e.target.value)}
                                  onFocus={() => toggleCourseDropdown(detail.id)}
                                  className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                                  disabled={detail.status === "success" || detail.status === "processing"}
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleCourseDropdown(detail.id)}
                                  className="px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200"
                                >
                                  📋
                                </button>
                              </div>
                              
                              {showCourseDropdown[detail.id] && (
                                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  <div className="sticky top-0 bg-white p-2 border-b">
                                    <div className="flex items-center gap-2">
                                      <Search className="w-4 h-4 text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search courses..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="flex-1 text-sm outline-none"
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  {COURSE_LIST.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase())).map(course => (
                                    <button
                                      key={course}
                                      type="button"
                                      onClick={() => updateFileCourse(detail.id, course)}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition border-b last:border-b-0"
                                    >
                                      {course}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Semester Selection */}
                          <div>
                            <label className="text-xs font-medium text-gray-700">Semester</label>
                            <div className="relative mt-1">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Select semester"
                                  value={detail.semester}
                                  readOnly
                                  onClick={() => toggleSemesterDropdown(detail.id)}
                                  className="flex-1 px-2 py-1 text-sm border rounded bg-gray-50 cursor-pointer"
                                  disabled={detail.status === "success" || detail.status === "processing"}
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleSemesterDropdown(detail.id)}
                                  className="px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200"
                                >
                                  📅
                                </button>
                              </div>
                              
                              {showSemesterDropdown[detail.id] && (
                                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg">
                                  {SEMESTERS.map(sem => (
                                    <button
                                      key={sem}
                                      type="button"
                                      onClick={() => updateFileSemester(detail.id, sem)}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition border-b last:border-b-0"
                                    >
                                      {sem}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {detail.courseName && detail.semester && (
                            <p className="text-xs text-green-600 mt-2">
                              ✓ Final: {detail.courseName} - {detail.semester} - Photo {detail.id + 1}
                            </p>
                          )}
                          
                          {detail.status === "success" && (
                            <div className="mt-2 text-xs text-green-700">
                              ✓ Certificate ID: {detail.certificateId}
                            </div>
                          )}
                          
                          {detail.status === "error" && detail.errorMessage && (
                            <div className="mt-2 text-xs text-red-600">
                              ❌ {detail.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || selectedFiles.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Issuing Certificates...
            </>
          ) : (
            `Issue ${fileDetails.filter(d => d.courseName && d.semester && d.status !== "success").length} Certificate(s)`
          )}
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          💡 Semesters rotate automatically: Photo 1→Sem1, Photo 2→Sem2, etc. You can also manually select for each file.
        </p>
      </form>
    </div>
  );
};

export default UploadCertificate;