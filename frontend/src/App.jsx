import { useState } from "react"
import Upload from "./components/Upload"
import Chat from "./components/Chat"

export default function App() {
  const [collectionId, setCollectionId] = useState(null)

  if (collectionId) return <Chat collectionId={collectionId} />
  return <Upload onUploadSuccess={setCollectionId} />
}