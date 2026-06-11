export interface Exercise {
  id: string
  title: string
  type: string
}

export interface ActiveStates {
  bold: boolean
  italic: boolean
  strike: boolean
  code: boolean
  codeBlock: boolean
  bulletList: boolean
  orderedList: boolean
  blockquote: boolean
  heading1: boolean
  heading2: boolean
  heading3: boolean
  heading4: boolean
  paragraph: boolean
  canUndo: boolean
  canRedo: boolean
}

export const defaultActiveStates: ActiveStates = {
  bold: false,
  italic: false,
  strike: false,
  code: false,
  codeBlock: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  heading1: false,
  heading2: false,
  heading3: false,
  heading4: false,
  paragraph: false,
  canUndo: false,
  canRedo: false,
}
