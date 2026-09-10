'use client'

import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react'

type Props = {
  children: ReactNode
}

type State = {
  failed: boolean
}

export default class LiveReactionBoundary
  extends Component<Props, State> {
  state: State = {
    failed: false,
  }

  static getDerivedStateFromError(): State {
    return {
      failed: true,
    }
  }

  componentDidCatch(
    _error: Error,
    _info: ErrorInfo,
  ): void {
    // The social island must never break the live player.
  }

  render() {
    if (this.state.failed) {
      return null
    }

    return this.props.children
  }
}