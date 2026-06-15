import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
}

export default function PhotoUpload({ files, onChange }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    onChange([...files, ...accepted])
  }, [files, onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  })

  const remove = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-amber-400 bg-amber-50'
            : 'border-amber-200 hover:border-amber-300 bg-amber-50/40'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-3xl mb-2">📷</p>
        <p className="text-stone-500 text-sm">
          {isDragActive ? '여기에 놓아주세요!' : '사진을 드래그하거나 클릭해서 업로드'}
        </p>
        <p className="text-stone-400 text-xs mt-1">여러 장 선택 가능</p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div key={index} className="relative group rounded-lg overflow-hidden aspect-square">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
