import { Card } from "@/components/ui/card"
import { File as FileIcon, Trash2Icon } from "lucide-react"

interface FileCardProps {
	file: File
	index: number
	handleDeleteFile: (index: number) => void
}

function FileCard({ file, handleDeleteFile, index }: FileCardProps) {
	return (
		<Card
			key={file.name}
			className="flex items-center justify-between gap-4 p-4 max-w-[280px] rounded-lg relative"
		>
			<FileIcon size={25} className="absolute left-4" />
			<p className="text-sm text-center ml-10 truncate max-w-[160px]">
				{file.name}
			</p>
			<Trash2Icon
				onClick={() => handleDeleteFile(index)}
				className="cursor-pointer bg-destructive-300/80 rounded-lg p-1 shadow-md hover:bg-red-500 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
				size={25}
			/>
		</Card>
	)
}

export default FileCard
