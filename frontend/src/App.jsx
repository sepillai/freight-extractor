import { useEffect, useRef, useState } from "react"

export default function App() {
  const FALLBACK_SAMPLE_PDFS = ["invoice1.pdf", "invoice2.pdf", "invoice3.pdf"]
  const fileInputRef = useRef(null)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [fileName, setFileName] = useState("")
  const [samplePdfs, setSamplePdfs] = useState([])
  const [loadingSamples, setLoadingSamples] = useState(true)

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
    if (confidence === "high") return "bg-[#fdbb21] text-[#3b2a00] border-[#fdbb21]"
    if (confidence === "medium") return "bg-[#ffe09a] text-[#5a4100] border-[#fdbb21]"
    return "bg-[#fff1eb] text-[#9d4a2c] border-[#f2c9b9]"
  }

  const getConfidenceLabel = (confidence) => {
    if (confidence === "high") return "High confidence - likely accurate"
    if (confidence === "medium") return "Medium confidence - please verify"
    return "Low confidence - review carefully"
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
      const res = await fetch(`${API_URL}/extract`, {
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

  const extractFromSample = async (sampleName) => {
    if (!sampleName) return

    setLoading(true)
    setError(null)
    setResult(null)
    setFileName(sampleName)

    try {
      const res = await fetch(`${API_URL}/extract-sample/${encodeURIComponent(sampleName)}`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail || "Sample extraction failed.")
      setResult(json.data)
    } catch (err) {
      setError(err.message || "Something went wrong while extracting the sample PDF.")
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

  useEffect(() => {
    const loadSamples = async () => {
      setLoadingSamples(true)
      try {
        const res = await fetch(`${API_URL}/sample-pdfs`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.detail || "Failed to load sample PDFs.")
        const files = Array.isArray(json.files) ? json.files : []
        setSamplePdfs(files.length > 0 ? files : FALLBACK_SAMPLE_PDFS)
      } catch {
        setSamplePdfs(FALLBACK_SAMPLE_PDFS)
      } finally {
        setLoadingSamples(false)
      }
    }

    loadSamples()
  }, [API_URL])

  return (
    <div className="min-h-screen bg-[#f4f0e6] px-4 py-8 text-[#1f1f1f]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <aside className="w-full rounded-2xl border border-[#ddd4bc] bg-[#f8f4e8] p-4 shadow-sm lg:sticky lg:top-6 lg:h-fit lg:max-w-xs">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6a6456]">Sample PDFs</h2>
          <p className="mt-2 text-sm text-[#605c52]">
            Try these invoice examples without uploading your own file.
          </p>
          <div className="mt-4 space-y-2">
            {loadingSamples ? (
              <p className="text-sm text-[#6b675d]">Loading sample PDFs...</p>
            ) : (
              samplePdfs.slice(0, 3).map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => extractFromSample(sample)}
                  disabled={loading}
                  className="w-full rounded-lg border border-[#fdbb21] bg-[#fdbb21] px-3 py-2 text-left text-sm font-semibold text-[#2e2200] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sample}
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
      <div className="mx-auto w-full max-w-4xl">
        <div className="inline-flex rounded-md border border-[#d8d1bd] bg-[#efe9d7] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#5f5a4b]">
          Freight AI
        </div>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-[#1d1d1f] sm:text-5xl">
          Freight invoice extraction, made clear
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-[#5d5a52]">
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
          className={`mt-8 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
            isDragActive
              ? "border-[#fdbb21] bg-[#ffe3a4]"
              : "border-[#d6cfba] bg-[#f8f4e8] hover:border-[#fdbb21] hover:bg-[#ffeab8]"
          } ${loading ? "cursor-not-allowed opacity-70" : "cursor-pointer shadow-sm hover:shadow"}`}
        >
          <p className="text-lg font-semibold text-[#262523]">
            {loading ? "Extracting invoice..." : "Drop PDF here or click to upload"}
          </p>
          <p className="mt-2 text-sm text-[#6b675d]">
            {fileName ? `Selected file: ${fileName}` : "Accepted format: PDF"}
          </p>
        </button>

        {loading && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#fdbb21] bg-[#ffe9bd] px-4 py-3 text-[#5c4100]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e4bb59] border-t-[#8a6200]" />
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
        <div className="mx-auto mt-10 w-full max-w-4xl">
          {result.needs_review && (
            <div className="mb-5 rounded-lg border border-[#fdbb21] bg-[#ffe5aa] px-4 py-3 text-[#5c4100]">
              <p className="font-semibold">Manual review recommended</p>
              <p className="text-sm">
                One or more fields were extracted with low confidence. Please verify highlighted values.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-[#ddd4bc] bg-[#f8f4e8] p-4 shadow-sm sm:p-5">
            <div className="mb-4 rounded-lg border border-[#fdbb21] bg-[#ffeec6] px-3 py-2 text-xs text-[#6d6756]">
              Confidence guide: <span className="font-semibold text-[#7a5600]">High</span> is usually accurate,
              <span className="font-semibold text-[#89630c]"> Medium</span> should be checked, and
              <span className="font-semibold text-[#9d4a2c]"> Low</span> likely needs manual review.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            {fieldConfig.map(({ key, label }) => {
              const field = result[key]
              const confidence = field?.confidence || "low"
              return (
                <div
                  key={key}
                  className="rounded-xl border border-[#e3dbc5] bg-[#fffdf7] p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-[#7a7362]">{label}</p>
                  <p className="mt-2 break-words text-base font-semibold text-[#20201d]">
                    {formatValue(field?.value)}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getConfidenceClass(
                      confidence
                    )}`}
                  >
                    {getConfidenceLabel(confidence)}
                  </span>
                </div>
              )
            })}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#ddd4bc] bg-[#f8f4e8] p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1f1f1f]">Line Items Breakdown</h2>
            <p className="mt-1 text-sm text-[#605c52]">
              Each card represents one billed charge from the invoice.
            </p>
            {lineItems.length === 0 ? (
              <p className="mt-2 text-sm text-[#605c52]">No line items detected.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {lineItems.map((item, index) => (
                  <article
                    key={`${item.description || "item"}-${index}`}
                    className="rounded-xl border border-[#e8dfc8] bg-[#fffdf7] p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-[#7a7362]">
                      Item {index + 1}
                    </p>
                    <p className="mt-1 text-base font-semibold text-[#20201d]">
                      {formatValue(item.description)}
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-[#746e60]">Quantity</dt>
                        <dd className="font-medium text-[#20201d]">{formatValue(item.quantity)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-[#746e60]">Unit Price</dt>
                        <dd className="font-medium text-[#20201d]">{formatValue(item.unit_price)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-[#ede5d1] pt-2">
                        <dt className="text-[#746e60]">Total</dt>
                        <dd className="font-semibold text-[#20201d]">{formatValue(item.total)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>

          <details className="mt-6 rounded-xl border border-[#ddd4bc] bg-[#f8f4e8] p-4">
            <summary className="cursor-pointer text-sm font-medium text-[#5f5a4b]">
              View formatted extraction payload
            </summary>
            <div className="mt-3 rounded-lg bg-[#1f1f1f] p-3">
              <code className="block whitespace-pre-wrap break-all text-xs text-[#f8f4e8]">
                {JSON.stringify(result, null, 2)}
              </code>
            </div>
          </details>
        </div>
      )}
        </main>
      </div>
    </div>
  )
}
