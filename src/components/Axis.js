import React, { PureComponent } from 'react'
//
import Animate from '../utils/Animate'
import Transition from '../utils/Transition'
import Path from '../primitives/Path'
import Line from '../primitives/Line'
import Text from '../primitives/Text'

import Connect from '../utils/Connect'
import Selectors from '../utils/Selectors'

const positionTop = 'top'
const positionRight = 'right'
const positionBottom = 'bottom'
const positionLeft = 'left'

const textEl = 'text'

// const getPixel = d => parseFloat(d)
const getPixel = d => d

class Axis extends PureComponent {
  static defaultProps = {
    tickArguments: [],
    tickValues: null,
    tickFormat: null,
    tickSizeInner: 6,
    tickSizeOuter: 6,
    tickPadding: 3,
    showGrid: true
  }
  constructor () {
    super()
    this.measure = this.measure.bind(this)
  }
  componentWillReceiveProps (newProps) {
    const oldProps = this.props
    if (oldProps.scale !== newProps.scale) {
      this.prevScale = oldProps.scale
    }
  }
  componentDidMount () {
    this.measure()
  }
  componentDidUpdate () {
    window.requestAnimationFrame(this.measure)
  }
  measure () {
    // Measure finds the amount of overflow this axis produces and
    // updates the margins to ensure that the axis is visible
    // Unfortunately, this currently happens after a render, but potentially
    // could happen pre-render if we could reliably predict the size of the
    // labels before they render. Considering that ticks could be anything,
    // even a react component, this could get very tough.
    const {
      tickSizeInner,
      tickSizeOuter,
      tickPadding,
      position,
      dispatch
    } = this.props

    const isHorizontal = position === positionTop || position === positionBottom
    const labelDims = Array(...this.el.querySelectorAll(textEl + '.-measureable')).map(el => el.getBoundingClientRect())

    if (labelDims.length !== this.ticks.length) {
      window.setTimeout(() => {
        window.requestAnimationFrame(this.measure)
      }, 1)
      return
    }

    let width = 0
    let height = 0
    let top = 0
    let bottom = 0
    let left = 0
    let right = 0

    if (isHorizontal) {
      // Add width overflow from the first and last ticks
      left = Math.ceil(getPixel(labelDims[0].width) / 2)
      right = Math.ceil(getPixel(labelDims[labelDims.length - 1].width) / 2)
      height =
        Math.max(tickSizeInner, tickSizeOuter) + // Add tick size
        tickPadding + // Add tick padding
        Math.max(...labelDims.map(d => Math.ceil(getPixel(d.height)))) // Add the height of the largest label
    } else {
      // Add height overflow from the first and last ticks
      top = Math.ceil(getPixel(labelDims[0].height) / 2)
      bottom = Math.ceil(getPixel(labelDims[labelDims.length - 1].height) / 2)
      width =
        Math.max(tickSizeInner, tickSizeOuter) + // Add tick size
        tickPadding + // Add tick padding
        Math.max(...labelDims.map(d => Math.ceil(getPixel(d.width)))) // Add the width of the largest label
    }

    dispatch(state => ({
      ...state,
      axes: {
        ...state.axes,
        [position]: {
          width,
          height,
          top,
          bottom,
          left,
          right
        }
      }
    }))
  }
  render () {
    const {
      scale,
      position,
      width,
      height,
      showGrid,
      tickArguments,
      tickValues,
      tickFormat,
      tickSizeInner,
      tickSizeOuter,
      tickPadding
    } = this.props

    if (!scale) {
      return null
    }

    const isVertical = position === positionLeft || position === positionRight
    const min =
      position === positionBottom ? height
      : position === positionLeft ? 0
      : position === positionTop ? 0
      : width
    const max =
      position === positionBottom ? -height
      : position === positionLeft ? width
      : position === positionTop ? height
      : -width
    const k = position === positionTop || position === positionLeft ? -1 : 1
    const transform = !isVertical ? translateX : translateY
    const ticks = this.ticks = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues
    const format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity) : tickFormat
    const spacing = Math.max(tickSizeInner, 0) + tickPadding
    const range = scale.range()
    const range0 = range[0] + 0.5
    const range1 = range[range.length - 1] + 0.5
    const scaleCopy = (scale.bandwidth ? center : identity)(scale.copy())

    this.prevScale = this.prevScale || scaleCopy

    return (
      <Animate
        data={{
          min: min,
          max: max,
          range0: range0,
          range1: range1,
          k: k,
          tickSizeOuter: tickSizeOuter
        }}
      >
        {({
          min,
          max,
          range0,
          range1,
          k,
          tickSizeOuter
        }) => {
          const axisPath = isVertical
            ? `M ${range1 + k * tickSizeOuter},${range0} H0.5 V${range1} H${range1 + k * tickSizeOuter}`
            : `M ${range0},${k * tickSizeOuter} V0.5 H${range1} V${k * tickSizeOuter}`

          return (
            <g
              className='Axis'
              fill='black'
              fontSize='10'
              fontFamily='sans-serif'
              textAnchor={position === positionRight ? 'start' : position === positionLeft ? 'end' : 'middle'}
              transform={position === positionRight ? translateX(max) : position === positionBottom ? translateY(min) : undefined}
            >
              <Path
                className='domain'
                d={axisPath}
                style={{
                  stroke: '#acacac',
                  strokeWidth: '1',
                  fill: 'transparent'
                }}
              />
              <Transition
                data={ticks}
                getKey={(d, i) => d}
                update={d => ({
                  tick: scaleCopy(d),
                  opacity: 1,
                  measureable: 1
                })}
                enter={d => ({
                  tick: this.prevScale(d),
                  opacity: 0,
                  measureable: 1
                })}
                leave={d => ({
                  tick: scaleCopy(d),
                  opacity: 0,
                  measureable: 0
                })}
                ignore={['measureable']}
              >
                {(inters) => {
                  return (
                    <g
                      className='ticks'
                      ref={el => { this.el = el }}
                    >
                      {inters.map((inter) => {
                        return (
                          <g
                            key={inter.key}
                            className='tick'
                            transform={transform(inter.state.tick)}
                          >
                            <Line
                              x1={isVertical ? '0.5' : '0.5'}
                              x2={isVertical ? k * tickSizeInner : '0.5'}
                              y1={isVertical ? '0.5' : '0.5'}
                              y2={isVertical ? '0.5' : k * tickSizeInner}
                              opacity={inter.state.opacity}
                              style={{
                                strokeWidth: 1,
                                opacity: 0.2
                              }}
                            />
                            {showGrid && (
                              <Line
                                x1={isVertical ? '0.5' : '0.5'}
                                x2={isVertical ? max : '0.5'}
                                y1={isVertical ? '0.5' : '0.5'}
                                y2={isVertical ? '0.5' : max}
                                opacity={inter.state.opacity}
                                style={{
                                  strokeWidth: 1,
                                  opacity: 0.2
                                }}
                              />
                            )}
                            <Text
                              x={isVertical ? k * spacing : '0.5'}
                              y={isVertical ? '0.5' : k * spacing}
                              dy={position === positionTop ? '0em' : position === positionBottom ? '0.71em' : '0.32em'}
                              className={inter.state.measureable && '-measureable'}
                              opacity={inter.state.opacity}
                            >
                              {format(inter.data)}
                            </Text>
                          </g>
                        )
                      })}
                    </g>
                  )
                }}
              </Transition>
            </g>
          )
        }}
      </Animate>
    )
  }
}

export default Connect((state, props) => {
  const {
    type
  } = props

  return {
    data: state.data,
    width: Selectors.gridWidth(state),
    height: Selectors.gridHeight(state),
    getX: state.getX,
    getY: state.getY,
    scale: state.scales && state.scales[type],
    position: state.position,
    showGrid: state.showGrid,
    tickArguments: state.tickArguments,
    tickValues: state.tickValues,
    tickFormat: state.tickFormat,
    tickSizeInner: state.tickSizeInner,
    tickSizeOuter: state.tickSizeOuter,
    tickPadding: state.tickPadding
  }
})(Axis)

function identity (x) {
  return x
}

function translateX (x) {
  return 'translate(' + x + ',0)'
}

function translateY (y) {
  return 'translate(0,' + y + ')'
}

function center (scale) {
  var offset = scale.bandwidth() / 2
  if (scale.round()) offset = Math.round(offset)
  return function (d) {
    return scale(d) + offset
  }
}
