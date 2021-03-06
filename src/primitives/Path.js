import React from 'react'
//
import Animate from '../utils/Animate'

const defaultStyle = {
  strokeWidth: 2,
  stroke: '#6b6b6b',
  fill: 'transparent',
  opacity: 1
}

export default React.createClass({
  render () {
    const {
      isActive,
      isInactive,
      visible,
      style,
      ...rest
    } = this.props

    const resolvedStyle = {
      ...defaultStyle,
      ...style
    }

    return (
      <Animate
        data={{
          ...resolvedStyle,
          stroke: isActive ? 'red' : resolvedStyle.stroke,
          opacity: visible * resolvedStyle.opacity
        }}
      >
        {(inter) => {
          // console.log('path', inter)
          return (
            <path
              {...inter}
              {...rest}
            />
          )
        }}
      </Animate>
    )
  }
})
