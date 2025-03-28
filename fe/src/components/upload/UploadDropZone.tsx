import { Button } from "@/components/ui/button"
import { CloudUpload } from "lucide-react"
import { DropzoneInputProps, DropzoneRootProps } from "react-dropzone"

interface UploadDropZoneProps {
	open: () => void
	getRootProps: <T extends DropzoneRootProps>(
		props?: T
	) => T & DropzoneRootProps
	getInputProps: <T extends DropzoneInputProps>(
		props?: T
	) => T & DropzoneInputProps
	className?: string
}

function UploadDropZone({
	open,
	getRootProps,
	getInputProps,
	className,
}: UploadDropZoneProps) {
	return (
		<div
			{...getRootProps({
				className: `${className} min-h-[25svh] flex flex-col items-center justify-center p-5 border-dashed border-2 rounded-lg"`,
			})}
		>
			<input {...getInputProps()} />
			<CloudUpload size={40} strokeWidth={0.8} className="text-main" />
			<div className="text-center">
				<p className="text-main font-semibold">
					Drag and drop a file to upload
				</p>
				<p className="text-sm text-neutral">
					CSV, TXT
					<br/>
					Up to 20MB per file
					<br/>
					Max 5 files
				</p>
			</div>
			<p className="font-semibold py-3">OR</p>
			<Button
				className="bg-green-700 hover:bg-green-600"
				onClick={open}
				type="button"
			>
				Browse Files
			</Button>
		</div>
	)
}

export default UploadDropZone
