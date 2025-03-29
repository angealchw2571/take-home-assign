import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import api from "@/lib/api"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { FileWithPath, useDropzone } from "react-dropzone"
import { useForm } from "react-hook-form"
import { v4 as uuidv4 } from 'uuid'
import { z } from "zod"
import FileCard from "./FileCard"
import UploadDropZone from "./UploadDropZone"
import StatementWindow from "./StatementWindow"


export interface FormInput {
	files: FileWithPath[]
}

export interface StatementEventData {
	sql: string
}

export interface InfoEventData {
	message: string
}

const FormSchema = z.object({
	files: z
		.array(z.instanceof(File))
		.min(1, { message: "Please upload at least one file" })
		.max(5, {
			message: `You can upload up to 5 files`,
		})
		.refine(
			(files) => files.every((file) => file.size <= 20 * 1024 * 1024),
			{ message: "Each file must be less than or equal to 20MB" }
		),
})

function UploadForm() {
	const [clientId] = useState(() => uuidv4())
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [sqlStatements, setSqlStatements] = useState<string[]>([])
	const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false)
	const [processingInfo, setProcessingInfo] = useState<string | null>(null)
	
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			files: [],
		},
	})

	const { handleSubmit } = form

	const setupEventSource = () => {
		const eventSource = new EventSource(`${import.meta.env.VITE_BACKEND_URL}/stream/${clientId}`)
		
		eventSource.addEventListener('statement', (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data) as StatementEventData;
				setSqlStatements(prev => [...prev, data.sql])
			} catch (err) {
				console.error('Error parsing statement:', err)
			}
		})
		
		eventSource.addEventListener('info', (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data) as InfoEventData;
				setProcessingInfo(data.message)
			} catch (err) {
				console.error('Error parsing info:', err)
			}
		})
		
		eventSource.addEventListener('error', (event: MessageEvent) => {
			console.error('Error processing file')
			eventSource.close()
			
			try {
				// Try to parse error data if available
				const data = JSON.parse(event.data);
				console.error('Processing error:', data.error || 'Unknown error');
			} catch (err) {
				console.error('Error parsing error event data');
			}
			
			setIsLoading(false)
		})
		
		eventSource.addEventListener('complete', () => {
			setIsLoading(false)
			setIsProcessingComplete(true)
			setProcessingInfo(null)
			eventSource.close()
		})
		
		return eventSource
	}

	const clearStatements = () => {
		setSqlStatements([])
		setIsProcessingComplete(false)
		setProcessingInfo(null)
	}

	const onSubmit = async (data: FormInput) => {
		setIsLoading(true)
		setSqlStatements([])
		setIsProcessingComplete(false)
		setProcessingInfo(null)
		
		try {
			if (data.files && data.files.length > 0) {
				const formData = new FormData()
				
				// Append all files to the form data
				data.files.forEach(file => {
					formData.append("files", file)
				})
				
				const result = await api.post(`/upload/${clientId}`, formData)
				// TODO need to handle more status codes. Happy day scenerario now
				if (result.status === 200) {
					console.log("Upload successful");
					
					// Set up event source to listen for processing updates
					const eventSource = setupEventSource();
					
					return () => {
						eventSource.close();
					};
				} else{
					console.error('Something went wrong');
				}
			} else {
				// No files to upload
				console.error('No files selected for upload');
				setIsLoading(false);
			}
		} catch (err: unknown) {
			console.error('Error uploading file:', err);
			setIsLoading(false);
		}
	}

	const { acceptedFiles, getRootProps, getInputProps, open } = useDropzone({
		noClick: true,
		noKeyboard: true,
		maxFiles: 5,
		accept: {
			"text/csv": [".csv"],
			"text/plain": [".txt"],
		},
		maxSize: 20 * 1024 * 1024, // 20 MB in bytes
	})

	useEffect(() => {
		const existingFiles = form.getValues("files") || []
		const totalFiles = existingFiles.length + acceptedFiles.length
		if (totalFiles > 5) {
			alert(`You can only upload up to ${5} files.`)
			return
		}

		// Filter out duplicate files
		const newFiles = acceptedFiles.filter(
			(file) =>
				!existingFiles.some(
					(existingFile) =>
						existingFile.name === file.name &&
						existingFile.size === file.size
				)
		)

		form.setValue("files", [...existingFiles, ...newFiles])
	}, [acceptedFiles, form])

	const files = form.watch("files")
	
	const handleDeleteFile = (index: number) => {
		if (window.confirm("Are you sure you want to delete this file?")) {
			const existingFiles = form.getValues("files") || []
			const updatedFiles = [...existingFiles]
			updatedFiles.splice(index, 1)
			form.setValue("files", updatedFiles)
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={handleSubmit(onSubmit)}>
				<Card className="w-[60svw]">
					<CardHeader>
						<CardTitle className="text-2xl">
							Upload Nem12 Data Files
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4 mx-5">
						{/* Files and Dropzone */}
						<div className="flex flex-row items-center gap-4">
							<UploadDropZone
								open={open}
								getRootProps={getRootProps}
								getInputProps={getInputProps}
								className="w-2/3"
							/>
							<div className="w-full grid grid-cols-2 gap-4 mt-4">
								{files.map((file, index) => {
									return (
										<FileCard
											key={file.name}
											file={file}
											index={index}
											handleDeleteFile={handleDeleteFile}
										/>
									)
								})}
							</div>
						</div>
						
						<Button
							type="submit"
							className="bg-green-700 hover:bg-green-800 py-5 my-2 mt-5 text-md"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Processing...
								</>
							) : (
								"Upload and Process Files"
							)}
						</Button>
						
						<StatementWindow 
							sqlStatements={sqlStatements}
							isProcessingComplete={isProcessingComplete}
							processingInfo={processingInfo}
							onClear={clearStatements}
						/>
					</CardContent>
				</Card>
			</form>
		</Form>
	)
}

export default UploadForm
