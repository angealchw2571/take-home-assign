import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import api from "@/lib/api"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { FileWithPath, useDropzone } from "react-dropzone"
import { useForm } from "react-hook-form"
import { z } from "zod"
import FileCard from "./FileCard"
import UploadDropZone from "./UploadDropZone"
import { Loader2, RefreshCw } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';


export interface FormInput {
	files: FileWithPath[]
}

export interface StatementEventData {
	sql: string
}

export interface InfoEventData {
	message: string
}

export interface ErrorEventData {
	error: string
}

export type EventType = "statement" | "info" | "error" | "complete"

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
	const [isLoading, setIsLoading] = useState(false)
	const [sqlStatements, setSqlStatements] = useState<string[]>([])
	const [isProcessingComplete, setIsProcessingComplete] = useState(false)
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
				const data = JSON.parse(event.data) as StatementEventData
				setSqlStatements(prev => [...prev, data.sql])
			} catch (err) {
				console.error('Error parsing statement:', err)
			}
		})
		
		eventSource.addEventListener('info', (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data) as InfoEventData
				setProcessingInfo(data.message)
			} catch (err) {
				console.error('Error parsing info:', err)
			}
		})
		
		eventSource.addEventListener('error', () => {
			console.error('Error processing file')
			eventSource.close()
			// TODO handle error message in data.error
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
				
				await api.post(`/upload/${clientId}`, formData)
				
				const eventSource = setupEventSource()
				
				return () => {
					eventSource.close()
				}
			}
		} catch (err) {
			console.error('Error uploading file:', err)
			setIsLoading(false)
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
						
						{sqlStatements.length > 0 && (
							<div className="mt-4">
								<h3 className="text-lg font-semibold mb-2 flex justify-between items-center">
									<span>{isProcessingComplete ? "Processing Complete" : "Processing Data..."}</span>
									<Button 
										variant="outline" 
										size="sm" 
										onClick={clearStatements}
										className="text-sm"
									>
										<RefreshCw className="h-4 w-4 mr-1" />
										Clear
									</Button>
								</h3>
								
								{processingInfo && (
									<div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-3 mb-3">
										{processingInfo}
									</div>
								)}
								
								<div className="max-h-[400px] overflow-y-auto border rounded p-4 bg-slate-50">
									<pre className="whitespace-pre-wrap text-sm">
										{sqlStatements.map((sql, index) => (
											<div key={index} className="mb-1 border-b pb-1">
												{sql}
											</div>
										))}
									</pre>
								</div>
								<div className="text-sm text-gray-500 mt-2">
									Generated {sqlStatements.length} SQL statements
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</form>
		</Form>
	)
}

export default UploadForm
