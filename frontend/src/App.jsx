import { useRef, useState } from "react"

export default function App() {
  const fileInputRef = useRef(null)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [fileName, setFileName] = useState("")

  const fieldConfig = [
    { key: "invoice_number", label: "Invoice Number" },
    { key: "carrier_name", label: "Carrier Name" },
    { key: "shipper", label: "Shipper" },
    { key: "consignee", label: "Consignee" },
    { key: "origin", label: "Origin" },
    { key: "destination", label: "Destination" },
    { key: "ship_date", label: "Ship Date" },
    { key: "delivery_date", label: "Delivery Date" },
    { key: "subtotal", label: "Subtotal" },
    { key: "taxes_fees", label: "Taxes & Fees" },
    { key: "total_amount", label: "Total Amount" },
    { key: "currency", label: "Currency" },
  ]

  const getConfidenceClass = (confidence) => {
    if (confidence === "high") return "bg-emerald-100 text-emerald-800 border-emerald-200"
    if (confidence === "medium") return "bg-amber-100 text-amber-800 border-amber-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "Not found"
    if (typeof value === "number") return value.toLocaleString()
    return String(value)
  }

  const extractFromFile = async (file) => {
    if (!file) return
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setFileName(file.name)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`${apiBaseUrl}/extract`, {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || "Extraction failed.")
      setResult(json.data)
    } catch (err) {
      setError(err.message || "Something went wrong while extracting the invoice.")
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => extractFromFile(e.target.files?.[0])
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragActive(true)
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragActive(false)
  }
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragActive(false)
    extractFromFile(e.dataTransfer?.files?.[0])
  }
  const openFilePicker = () => fileInputRef.current?.click()

  const lineItems = Array.isArray(result?.line_items) ? result.line_items : []

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900">Freight Invoice Extractor</h1>
        <p className="mt-2 text-slate-600">
          Drag and drop a freight invoice PDF, or click to upload and extract structured fields.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={loading}
          className={`mt-6 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40"
          } ${loading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
        >
          <p className="text-lg font-semibold text-slate-800">
            {loading ? "Extracting invoice..." : "Drop PDF here or click to upload"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {fileName ? `Selected file: ${fileName}` : "Accepted format: PDF"}
          </p>
        </button>

        {loading && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
            <span>Parsing the invoice and extracting fields. This can take a few seconds.</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="mx-auto mt-8 w-full max-w-4xl">
          {result.needs_review && (
            <div className="mb-5 rounded-lg border border-yellow-300 bg-yellow-100 px-4 py-3 text-yellow-900">
              <p className="font-semibold">Manual review recommended</p>
              <p className="text-sm">
                One or more fields were extracted with low confidence. Please verify highlighted values.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {fieldConfig.map(({ key, label }) => {
              const field = result[key]
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <span className="w-44 shrink-0 text-sm font-medium text-slate-700">{label}</span>
                  <span className="flex-1 text-right text-sm text-slate-900">{formatValue(field?.value)}</span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getConfidenceClass(
                      field?.confidence
                    )}`}
                  >
                    {field?.confidence || "low"}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
            {lineItems.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No line items detected.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="px-2 py-2 font-medium">Description</th>
                      <th className="px-2 py-2 font-medium">Quantity</th>
                      <th className="px-2 py-2 font-medium">Unit Price</th>
                      <th className="px-2 py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr
                        key={`${item.description || "item"}-${index}`}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-2 py-2 text-slate-900">{formatValue(item.description)}</td>
                        <td className="px-2 py-2 text-slate-900">{formatValue(item.quantity)}</td>
                        <td className="px-2 py-2 text-slate-900">{formatValue(item.unit_price)}</td>
                        <td className="px-2 py-2 text-slate-900">{formatValue(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <details className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              View formatted extraction payload
            </summary>
            <div className="mt-3 rounded-lg bg-slate-900 p-3">
              <code className="block whitespace-pre-wrap break-all text-xs text-slate-100">
                {JSON.stringify(result, null, 2)}
              </code>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
