import React, { useState } from 'react'
import { Button, Card } from './index'
import { Logo, Navigation } from '../Header'

const ComponentTestSuite: React.FC = () => {
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({})

  const handleClick = (buttonId: string) => {
    setClickCounts(prev => ({
      ...prev,
      [buttonId]: (prev[buttonId] || 0) + 1
    }))
  }

  const handleLogoClick = () => {
    handleClick('logo')
  }

  const handlePageChange = (page: 'dashboard' | 'upload' | 'results') => {
    handleClick(`nav-${page}`)
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Component Test Suite</h1>
      
      {/* Logo Tests */}
      <Card title="Logo Component Tests">
        <div className="space-y-6">
          {/* Logo Sizes */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Logo Sizes</h3>
            <div className="flex flex-wrap gap-6 items-center">
              <div className="text-center">
                <Logo size="sm" onClick={handleLogoClick} />
                <p className="text-xs text-gray-500 mt-1">Small</p>
              </div>
              <div className="text-center">
                <Logo size="md" onClick={handleLogoClick} />
                <p className="text-xs text-gray-500 mt-1">Medium (Default)</p>
              </div>
              <div className="text-center">
                <Logo size="lg" onClick={handleLogoClick} />
                <p className="text-xs text-gray-500 mt-1">Large</p>
              </div>
            </div>
          </div>

          {/* Logo Click Counter */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Logo Interactions</h3>
            <div className="flex items-center gap-4">
              <Logo onClick={handleLogoClick} />
              <span className="text-sm text-gray-600">
                Logo clicks: {clickCounts.logo || 0}
              </span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Navigation Tests */}
      <Card title="Navigation Component Tests">
        <div className="space-y-6">
          {/* Navigation with Default State */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Navigation - Default State</h3>
            <Navigation onPageChange={handlePageChange} />
            <p className="text-xs text-gray-500 mt-2">Dashboard should be active by default</p>
          </div>

          {/* Navigation with Different Active States */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Navigation - Active States</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Active: Dashboard</p>
                <Navigation activePage="dashboard" onPageChange={handlePageChange} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Active: Upload</p>
                <Navigation activePage="upload" onPageChange={handlePageChange} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Active: Results</p>
                <Navigation activePage="results" onPageChange={handlePageChange} />
              </div>
            </div>
          </div>

          {/* Navigation Click Counter */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Navigation Interactions</h3>
            <div className="space-y-2">
              <Navigation onPageChange={handlePageChange} />
              <div className="text-sm text-gray-600">
                <p>Dashboard clicks: {clickCounts['nav-dashboard'] || 0}</p>
                <p>Upload clicks: {clickCounts['nav-upload'] || 0}</p>
                <p>Results clicks: {clickCounts['nav-results'] || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Button Tests */}
      <Card title="Button Component Tests">
        <div className="space-y-6">
          {/* Button Variants */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Button Variants</h3>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleClick('primary')}>
                Primary ({clickCounts.primary || 0})
              </Button>
              <Button variant="secondary" onClick={() => handleClick('secondary')}>
                Secondary ({clickCounts.secondary || 0})
              </Button>
              <Button variant="danger" onClick={() => handleClick('danger')}>
                Danger ({clickCounts.danger || 0})
              </Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Button Sizes</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="sm" onClick={() => handleClick('small')}>
                Small ({clickCounts.small || 0})
              </Button>
              <Button size="md" onClick={() => handleClick('medium')}>
                Medium ({clickCounts.medium || 0})
              </Button>
              <Button size="lg" onClick={() => handleClick('large')}>
                Large ({clickCounts.large || 0})
              </Button>
            </div>
          </div>

          {/* Button States */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Button States</h3>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleClick('normal')}>
                Normal ({clickCounts.normal || 0})
              </Button>
              <Button disabled onClick={() => handleClick('disabled')}>
                Disabled ({clickCounts.disabled || 0})
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Card Tests */}
      <Card title="Card Component Tests">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Card with Title" padding="sm">
            <p className="text-sm text-gray-600">Small padding card with title</p>
          </Card>
          
          <Card padding="md">
            <p className="text-gray-600">Medium padding card without title</p>
          </Card>
          
          <Card title="Large Padding" padding="lg">
            <p className="text-gray-600">Large padding card with title</p>
          </Card>
        </div>
      </Card>

      {/* Integration Test */}
      <Card title="Integration Test - Cards with Buttons">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Primary Actions">
            <div className="space-y-3">
              <Button onClick={() => handleClick('card-primary')}>
                Primary Action ({clickCounts['card-primary'] || 0})
              </Button>
              <Button variant="secondary" onClick={() => handleClick('card-secondary')}>
                Secondary Action ({clickCounts['card-secondary'] || 0})
              </Button>
            </div>
          </Card>
          
          <Card title="Danger Zone">
            <div className="space-y-3">
              <Button variant="danger" onClick={() => handleClick('card-danger')}>
                Delete ({clickCounts['card-danger'] || 0})
              </Button>
              <Button disabled onClick={() => handleClick('card-disabled')}>
                Disabled Action ({clickCounts['card-disabled'] || 0})
              </Button>
            </div>
          </Card>
        </div>
      </Card>

      {/* Test Results */}
      <Card title="Test Results Summary">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Total button clicks: {Object.values(clickCounts).reduce((sum, count) => sum + count, 0)}
          </p>
          <div className="text-xs text-gray-500">
            <p>✅ All components should render correctly</p>
            <p>✅ Buttons should be clickable and show click counts</p>
            <p>✅ Disabled buttons should not be clickable</p>
            <p>✅ Cards should display content and titles properly</p>
            <p>✅ Responsive design should work on different screen sizes</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ComponentTestSuite
