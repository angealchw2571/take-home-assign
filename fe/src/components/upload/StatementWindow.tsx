import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface StatementWindowProps {
  sqlStatements: string[]
  isProcessingComplete: boolean
  processingInfo: string | null
  onClear: () => void
}

const StatementWindow = ({
  sqlStatements,
  isProcessingComplete,
  processingInfo,
  onClear
}: StatementWindowProps) => {
  if (sqlStatements.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2 flex justify-between items-center">
        <span>{isProcessingComplete ? "Processing Complete" : "Processing Data..."}</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClear}
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
  )
}

export default StatementWindow
