import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { FolderIcon, FolderOpenIcon, ChevronRightIcon, LoadingIcon } from './ViewModeSelector'
import ZoomControl from './ZoomControl'

interface Photo {
  id: number
  filename: string
  filepath: string
  rotation_version?: number
  user_rotation?: number
  created_at: string
}

interface FileTreeNode {
  id: string
  path: string
  name: string
  type: 'directory' | 'file'
  children?: FileTreeNode[]
  photoCount?: number
  recursivePhotoCount?: number
  isExpanded?: boolean
  isLoading?: boolean
}

interface FilesViewProps {
  onPhotoClick?: (photo: Photo, photos: Photo[], index: number) => void
}

const FilesView: React.FC<FilesViewProps> = ({ onPhotoClick }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [splitPosition, setSplitPosition] = useState(300)
  const [isDragging, setIsDragging] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(4)
  
  // Fetch folder tree
  const { data: folderTree, isLoading: treeLoading } = useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/folders/tree')
      if (!response.ok) throw new Error('Failed to fetch folder tree')
      return response.json()
    },
    refetchInterval: false,
  })
  
  // Fetch photos for selected folder (recursively)
  const { data: folderPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['folders', selectedFolder, 'photos', 'recursive'],
    queryFn: async () => {
      if (!selectedFolder) return { photos: [], count: 0 }
      const response = await fetch(`http://localhost:8000/api/v1/folders/${encodeURIComponent(selectedFolder)}/photos?recursive=true`)
      if (!response.ok) throw new Error('Failed to fetch folder photos')
      return response.json()
    },
    enabled: !!selectedFolder,
    refetchInterval: false,
  })
  
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }
  
  const selectFolder = (node: FileTreeNode) => {
    if (node.type === 'directory') {
      setSelectedFolder(node.path)
    }
  }
  
  const getThumbnailUrl = (photo: Photo) => {
    const baseUrl = `http://localhost:8000/api/v1/thumbnails/${photo.id}/400`
    const version = photo.rotation_version || 0
    return version ? `${baseUrl}?v=${version}` : baseUrl
  }
  
  const renderTreeNode = (node: FileTreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedFolder === node.path
    const hasChildren = node.children && node.children.length > 0
    
    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-700 transition-colors ${
            isSelected ? 'bg-gray-700' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) toggleNode(node.id)
            selectFolder(node)
          }}
        >
          {/* Chevron for expandable folders */}
          {hasChildren && (
            <span className="text-gray-400 transition-transform inline-block" 
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
              <ChevronRightIcon />
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          
          {/* Folder icon */}
          <span className="text-yellow-500">
            {node.type === 'directory' && (isExpanded ? <FolderOpenIcon /> : <FolderIcon />)}
          </span>
          
          {/* Name and count */}
          <span className="flex-1">{node.name}</span>
          {node.recursivePhotoCount !== undefined && node.recursivePhotoCount > 0 && (
            <span className="text-xs text-gray-500">({node.recursivePhotoCount})</span>
          )}
        </div>
        
        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = e.clientX
      if (newPosition > 200 && newPosition < 600) {
        setSplitPosition(newPosition)
      }
    }
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('mousemove', handleMouseMove as any)
      return () => {
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('mousemove', handleMouseMove as any)
      }
    }
  }, [isDragging])
  
  const photos = folderPhotos?.photos || []
  const breadcrumbs = selectedFolder?.split('/').filter(Boolean) || []
  
  return (
    <div className="flex h-screen bg-gray-900 text-white pb-8" onMouseMove={handleMouseMove}>
      {/* Left Panel - Folder Tree */}
      <div 
        className="bg-gray-800 border-r border-gray-700 overflow-y-auto pb-2"
        style={{ width: `${splitPosition}px` }}
      >
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
            <FolderIcon />
            FOLDERS
          </h3>
        </div>
        
        <div className="py-2">
          {treeLoading ? (
            <div className="px-4 py-2 text-gray-500 flex items-center gap-2">
              <LoadingIcon />
              Loading folders...
            </div>
          ) : (
            folderTree?.nodes?.map((node: FileTreeNode) => renderTreeNode(node))
          )}
        </div>
      </div>
      
      {/* Divider */}
      <div
        className="w-1 bg-gray-700 cursor-col-resize hover:bg-blue-500 transition-colors"
        onMouseDown={() => setIsDragging(true)}
      />
      
      {/* Right Panel - Photos */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Breadcrumb */}
        {selectedFolder && (
          <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm">
                <span className="text-gray-400">/</span>
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <span className="text-gray-300">{crumb}</span>
                    {idx < breadcrumbs.length - 1 && (
                      <span className="text-gray-400">/</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <span className="text-sm text-gray-400">
                {folderPhotos?.count || photos.length} photos (recursive)
              </span>
            </div>
          </div>
        )}
        
        {/* Photo Grid */}
        <div className="p-4">
          {!selectedFolder ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="flex justify-center mb-4">
                <FolderIcon />
              </div>
              Select a folder to view photos
            </div>
          ) : photosLoading ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="flex justify-center mb-4">
                <LoadingIcon />
              </div>
              Loading photos...
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="flex justify-center mb-4">
                <FolderIcon />
              </div>
              No photos in this folder
            </div>
          ) : (
            <>
              {/* Zoom Control - Subtle bottom-right */}
              <ZoomControl 
                value={zoomLevel} 
                onChange={setZoomLevel}
                min={2}
                max={8}
              />
              
              <div 
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${zoomLevel}, minmax(0, 1fr))` }}
              >
              {photos.map((photo: Photo, idx: number) => (
                <div
                  key={photo.id}
                  className="relative aspect-square bg-gray-800 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => onPhotoClick?.(photo, photos, idx)}
                >
                  <Image
                    src={getThumbnailUrl(photo)}
                    alt={photo.filename}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16.66vw"
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white truncate">{photo.filename}</p>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilesView