'use strict'

import * as d3 from 'd3'
import * as cf from 'crossfilter2'

import {TextLength} from './textlength.js'
import {DocumentCount} from './documentcount.js'
import {WorldMap} from './worldmap'
import {LanguageCount} from './languagecount.js'
import {Cluster} from './cluster.js'

const NUMBER_LENGTH_BINS = 10

export class ViewCoordinator {
  constructor (vue, searchState) {
    let t = this
    t.vue = vue
    t.searchState = searchState
  }

  /**
   * Pass visualization data to the view coordinator.
   *
   * @param data is the entire object
   * @param data.basicInformation contains basic information about all the
   *   documents
   * @param data.documents contains an array with information of all documents
   */
  setDocumentData (data) {
    let t = this
    t.basicInformation = data.basicInformation
    t.documents = data.documents
    let parseDate = d3.timeParse('%Y-%m-%d')
    t.documents.forEach(function (d) {
      d.date = parseDate(d.date)
      d.id = +d.id
      d.cluster = +d.cluster
    })
    // Event handling
    t.dispatch = d3.dispatch('dateStart', 'dateEnd', 'dateClear',
      'lengthStart', 'lengthEnd', 'lengthClear',
      'mapStart', 'mapEnd', 'languageSelection', 'languageClear',
      'clusterSelection', 'clusterClear')
    t.cf = cf(t.documents)
    t.createDimensionsGroups()
    t.createViews()
    t.prepareVisualization()
    t.updateVisualization()
    t.setupDispatch()
  }

  createDimensionsGroups () {
    let t = this
    // Date dimension
    t.dateDimension = t.cf.dimension(function (d) {
      return d.date
    })
    let dateGroup = function (d) {
      return new Date(`${d.getFullYear()}`)
    }
    t.dateCountGroup = t.dateDimension.group(dateGroup)
    // Length dimension
    t.lengthDimension = t.cf.dimension(function (d) {
      return d.textLength
    })
    t.textLengthMin = t.lengthDimension.bottom(1)[0].textLength
    t.textLengthRange = t.lengthDimension.top(1)[0].textLength - t.textLengthMin
    let lengthBins = function (d) {
      return Math.floor(((d - t.textLengthMin) / t.textLengthRange) *
        NUMBER_LENGTH_BINS)
    }
    t.lengthDimensionGroup = t.lengthDimension.group(lengthBins).reduceCount()
    // Latitude and longitude dimensions
    t.longitudeDimension = t.cf.dimension(function (d) {
      return d.longitude
    })
    t.latitudeDimension = t.cf.dimension(function (d) {
      return d.latitude
    })
    t.locationDimension = t.cf.dimension(function (d) {
      return d.id
    })
    t.languageDimension = t.cf.dimension(function (d) {
      return d.language
    })
    t.languageGroup = t.languageDimension.group()
    t.clusterDimension = t.cf.dimension(function (d) {
      return d.cluster
    })
    t.clusterDimensionGroup = t.clusterDimension.group()
  }

  /**
   * Count the number of text lengths in each group and return them. The
   * grouping maps each element to an index in [0, NUMBER_BINS]. This range
   * needs to be scaled to the text lengths, so an additional field
   * 'scaledKey' is introduced.
   */
  textLengthData () {
    let t = this
    let bins = t.lengthDimensionGroup.top(Infinity)
    bins.forEach(function (d) {
      d.scaledKey = t.textLengthMin + d.key / NUMBER_LENGTH_BINS * t.textLengthRange
    })
    return bins
  }

  prepareVisualization () {
    let t = this
    t.textLength.prepare()
    t.documentCount.prepare()
    t.worldMap.prepare()
    t.languageCount.prepare()
    t.clusterCount.prepare()
  }

  createViews () {
    let t = this
    t.documentCount = new DocumentCount('documentCount', this, 80, 800)
    t.textLength = new TextLength('textLength', this, 80, 800)
    t.worldMap = new WorldMap('geo-map', this, 170, 800)
    t.languageCount = new LanguageCount('language-count', this, 80, 800)
    t.clusterCount = new Cluster('cluster-count', this, 700, 140)
  }

  setupDispatch () {
    let t = this
    t.dispatch.on('dateStart', function () {
      t.searchState.clearDateRange()
      t.dateDimension.filterAll()
    })
    t.dispatch.on('dateEnd', function (range) {
      t.searchState.setDateRange(range)
      t.dateDimension.filterRange(range)
      t.updateVisualizationText()
    })
    t.dispatch.on('dateClear', function () {
      t.searchState.clearDateRange()
      t.dateDimension.filterAll()
      t.updateVisualizationText()
    })
    t.dispatch.on('lengthStart', function () {
      t.searchState.clearLengthRange()
      t.lengthDimension.filterAll()
    })
    t.dispatch.on('lengthEnd', function (range) {
      t.searchState.setLengthRange(range)
      t.lengthDimension.filterRange(range)
      t.updateVisualizationText()
    })
    t.dispatch.on('lengthClear', function () {
      t.searchState.clearLengthRange()
      t.lengthDimension.filterAll()
      t.updateVisualizationText()
    })
    t.dispatch.on('mapEnd', function (ranges) {
      t.latitudeDimension.filterRange(ranges.latitudeRange)
      t.longitudeDimension.filterRange(ranges.longitudeRange)
      t.searchState.setLatitudeRange(ranges.latitudeRange)
      t.searchState.setLongitudeRange(ranges.longitudeRange)
      t.updateVisualizationText()
    })
    t.dispatch.on('mapStart', function () {
      t.longitudeDimension.filterAll()
      t.latitudeDimension.filterAll()
      t.searchState.clearLatitudeRange()
      t.searchState.clearLongitudeRange()
      t.updateVisualizationText()
    })
    t.dispatch.on('languageSelection', function (language) {
      t.languageDimension.filterExact(language)
      t.searchState.selectLanguage(language)
      t.updateVisualizationText()
    })
    t.dispatch.on('languageClear', function () {
      t.languageDimension.filterAll()
      t.searchState.clearLanguage()
      t.updateVisualizationText()
    })
    t.dispatch.on('clusterSelection', function (cluster) {
      t.clusterDimension.filterExact(cluster)
      t.searchState.selectCluster(cluster)
      t.updateVisualizationText()
    })
    t.dispatch.on('clusterClear', function () {
      t.clusterDimension.filterAll()
      t.searchState.clearCluster()
      t.updateVisualizationText()
    })
  }

  updateVisualization () {
    let t = this
    t.documentCount.update(t.dateCountGroup.all())
    t.textLength.update(t.textLengthData())
    t.worldMap.update(t.locationDimension.top(Infinity))
    t.languageCount.update(t.languageGroup.reduceCount().top(Infinity))
    t.clusterCount.update(t.clusterDimensionGroup.reduceCount().top(20))
    t.vue.updateSelected(t.locationDimension.top(Infinity).length)
  }

  updateVisualizationText () {
    this.updateVisualization()
    this.vue.filterEvent()
  }

  clear () {
    let t = this
    if (t.textLength !== undefined) {
      t.textLength.update([])
    }
    if (t.documentCount !== undefined) {
      t.documentCount.update([])
    }
    if (t.documentCount !== undefined) {
      t.worldMap.update([])
    }
    if (t.languageCount !== undefined) {
      t.languageCount.update([])
    }
    if (t.clusterCount !== undefined) {
      t.clusterCount.update([])
    }
  }
}
