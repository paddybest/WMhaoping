// components/lottery-wheel/lottery-wheel.js
Component({
  properties: {
    // 转盘旋转角度
    rotation: {
      type: Number,
      value: 0
    },
    // 是否正在旋转
    isSpinning: {
      type: Boolean,
      value: false
    }
  },

  data: {
    wheelStyle: ''
  },

  observers: {
    'rotation, isSpinning': function(rotation, isSpinning) {
      // 更新转盘样式
      this.setData({
        wheelStyle: this.getWheelStyle(rotation, isSpinning)
      })
    }
  },

  methods: {
    // 获取转盘样式
    getWheelStyle(rotation, isSpinning) {
      return {
        transform: `rotate(${rotation}deg)`,
        transition: isSpinning ? 'transform 3.5s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
      }
    }
  }
})