'use strict'

import {View} from './view.js'
import * as d3 from 'd3'

export class LanguageCount extends View {
  prepare () {
    let t = this
    t.x = d3.scaleBand().range([0, t.width]).padding(0.2)
    t.xAxis = d3.axisBottom().scale(t.x)
    t.y = d3.scaleLog().range([t.height, 0])
    t.yAxis = d3.axisLeft().scale(t.y).ticks(3, '.3s')
    t.colorList = [
      '#d73027',
      '#4575b4',
      '#762a83',
      '#1a9850',
      '#fee08b'
    ]
    t.color = d3.scaleOrdinal().range(t.colorList)
    t.mainShape = 'rect'
    t.mainClass = 'barLanguage'
    t.dotMainClass = '.barLanguage'
    t.svg.append('g').attr('class', 'x axis')
    t.svg.append('g').attr('class', 'y axis')
    t.addTitle('Languages')
  }

  update (data) {
    data.forEach(function (d) {
      if (d.key === '') {
        d.key = 'n.a.'
      }
    })
    let t = this
    t.x.domain(data.map(function (d) {
      return d.key
    }))
    t.y.domain(d3.extent(data, function (d) {
      return d.value + 1
    }))
    let updateSelection = t.svg.selectAll(t.dotMainClass)
      .data(data, function (d) {
        return d.key
      })
    updateSelection.exit().remove()
    updateSelection.transition()
      .duration(t.transition)
      .attr('fill', function (d, i) { return t.color(i % t.colorList.length) })
      .attr('x', function (d) {
        return t.x(d.key)
      })
      .attr('y', function (d) {
        return t.y(d.value + 1)
      })
      .attr('height', function (d) {
        return t.height - t.y(d.value + 1)
      })
    updateSelection.enter()
      .append(t.mainShape)
      .attr('class', t.mainClass)
      .attr('fill', function (d, i) { return t.color(i % t.colorList.length) })
      .attr('x', function (d) {
        return t.x(d.key)
      })
      .attr('y', function (d) {
        return t.y(d.value + 1)
      })
      .attr('width', t.x.bandwidth())
      .attr('height', function (d) {
        return t.height - t.y(d.value + 1)
      })
      .on('click', function (d, i) {
        if (d.key === 'n.a.') { return }
        if (d.key === t.viewCoordinator.searchState.language) {
          d3.select(this).attr('fill', t.color(i % t.colorList.length))
          d3.selectAll(t.dotMainClass).attr('fill',
            function (d, i) { return t.color(i % t.colorList.length) })
          t.dispatch.call('languageClear')
        } else {
          d3.selectAll(t.dotMainClass).attr('fill', t.defaultGray)
          d3.select(this).attr('fill', t.color(i % t.colorList.length))
          t.dispatch.call('languageSelection', t, d.key)
        }
      })
    t.svg.select('.x.axis').transition()
      .duration(t.transition)
      .attr('transform', `translate(0,${t.height})`)
      .call(t.xAxis)
    t.svg.select('.y.axis').transition()
      .duration(t.transition)
      .call(t.yAxis)
  }
}
