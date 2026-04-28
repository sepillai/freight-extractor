import { useState } from "react"

export default function App() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("http://localhost:8000/extract", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail)
      setResult(json.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Freight Invoice Extractor</h1>
      <p className="text-gray-500 mb-6">Upload a freight invoice PDF to extract structured data</p>

      <input type="file" accept=".pdf" onChange={handleUpload}
        className="mb-6 block border rounded p-2 w-full" />

      {loading && <p className="text-blue-500">Extracting...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {result && (
        <div>
          {result.needs_review && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 
              rounded p-3 mb-4">
              ⚠️ Some fields need review — low confidence detected
            </div>
          )}
          <pre className="bg-white border rounded p-4 text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}