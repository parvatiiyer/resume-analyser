import { type FormEvent, useState } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "~/constants/index";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();

    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");

    const handleFileSelect = (selectedFile: File | null) => {
        setFile(selectedFile);
    };

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file,
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        setIsProcessing(true);

        setStatusText("Uploading the file...");
        const uploadedFile = await fs.upload([file]);
        if (!uploadedFile) {
            setIsProcessing(false);
            return setStatusText("Error uploading file");
        }

        setStatusText("Converting to image...");
        const imageFile = await convertPdfToImage(file);
        if (!imageFile) {
            setIsProcessing(false);
            return setStatusText("Error converting PDF");
        }

        setStatusText("Uploading the image...");
        const uploadedImage = await fs.upload([imageFile]);
        if (!uploadedImage) {
            setIsProcessing(false);
            return setStatusText("Error uploading image");
        }

        setStatusText("Reading resume text...");
        const resumeText = await ai.img2txt(imageFile);
        if (!resumeText) {
            setIsProcessing(false);
            return setStatusText("Could not read resume text");
        }

        setStatusText("Analyzing...");
        const feedback = await ai.feedback(
            uploadedFile.path,
            prepareInstructions({
                jobTitle,
                jobDescription,
                resumeText,
            })
        );

        if (!feedback || (feedback as any).success === false) {
            setIsProcessing(false);
            return setStatusText(
                (feedback as any)?.error ?? "AI analysis failed"
            );
        }

        const content = (feedback as any).message?.content;
        const feedbackText =
            typeof content === "string" ? content : content?.[0]?.text;

        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName,
            jobTitle,
            jobDescription,
            feedback: JSON.parse(feedbackText),
        };

        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setIsProcessing(false);
        setStatusText("Analysis complete");
        console.log(data);
        setStatusText("Analysis complete, redirecting...");
        navigate(`/resume/${uuid}`);
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData(e.currentTarget);
        const companyName = formData.get("company-name") as string;
        const jobTitle = formData.get("job-title") as string;
        const jobDescription = formData.get("job-description") as string;

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>

                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}

                    {!isProcessing && (
                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-4 mt-8"
                        >
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input
                                    id="company-name"
                                    name="company-name"
                                    type="text"
                                    required
                                />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input
                                    id="job-title"
                                    name="job-title"
                                    type="text"
                                    required
                                />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea
                                    id="job-description"
                                    name="job-description"
                                    rows={5}
                                    required
                                />
                            </div>

                            <div className="form-div">
                                <label>Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button
                                className="primary-button"
                                type="submit"
                                disabled={!file}
                            >
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;
