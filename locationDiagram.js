window.console.log( 'SCS Location Diagramming!');


/*** BEGIN DATA SECTION ***/
// TODO: All of this data would compose a Vuex store state


const workspaceData = {
    width: 0,                       // Width of the bounding box for this SVG image; the total width available in the SVG = ( 2 * workspaceData.padding ) + locationData.width
    height: 0,                      // Height of the bounding box for this SVG image; the total height available in the SVG = ( 2 * workspaceData.padding ) + locationData.height
    padding: 250,                   // Amount of SVG spacing to place around the diagram's bounding box
    gridInterval: 10,               // How often on the x and y axis does a grid line draw; defines snap-to coordinates
    gridRowIntervals: [],           // Collection of y axis values to draw a row of the grid
    gridColumnIntervals: [],        // Collection of x axis values to draw a column of the grid
    gridPointPreviewCoordinates: [],// The grid point to show where the mouse is currently hovering
    selectedWallCount: null
}

const locationData = {
    width: 600, // Width of the bounding box for this diagram; all diagram walls will fit within this width
    height: 400 // Height of the bounding box for this diagram; all diagram walls will fit within this height
}

// Initialize the static workspace bounding box based on the static location and workspace data
workspaceData.width = locationData.width + ( 2 * workspaceData.padding );
workspaceData.height = locationData.height + ( 2 * workspaceData.padding );

// Initialize the static workspace grid row and column intervals based on the location and workspace data
for( let i = workspaceData.gridInterval; i < workspaceData.width  || i < workspaceData.height ; i += workspaceData.gridInterval ) {
    if( i < workspaceData.height  ) {
        workspaceData.gridRowIntervals.push( i );
    }
    if( i < workspaceData.width  ) {
        workspaceData.gridColumnIntervals.push( i );
    }
}

const diagramData = {
    /**
     * These coordinates are the points for every corner of the diagram's room(s). 
     
     * The first point in this collection will always be [0,0] in order to ground the diagram. 
     * These points should never capture offsets meant to adjust the rendered location of the diagram.
     * 
     * These coordinates are in order and thus walls are drawn between 
     * point[0] - point[1] and then from 
     * point[1] - point[2] ... terminating in
     * point[n] - point[0] which closes the walls
     */
    orderedCornerCoordinates: [ 
        [ 0 , 0 ],                                      // Top Left (Origin in SVG coordinate system)
        [ locationData.width, 0 ],                      // Top Right
        [ locationData.width, locationData.height ],    // Bottom Right
        [ 0, locationData.height ]                      // Bottom Left
    ],
    wallCoordinates: getDiagramDataWalls
}

/** 
 * A static function that accepts a collection of orderedCornerCoordinates 
 * and returns an array of pairs of orderedCornerCoordinates elements 
 * which describe the start and end points of diagram walls.
 *
 * These coordinates are exptected to be in order and thus walls will be drawn between 
 * point[0] - point[1] and then from 
 * point[1] - point[2] ... terminating in
 * point[n] - point[0] which closes the walls
 */
function getDiagramDataWalls( orderedCornerCoordinates ) {
    const wallSections = [];
    for( let i = 0; i < orderedCornerCoordinates.length; i++ ) {
        if( i < orderedCornerCoordinates.length - 1 ) {
            wallSections.push( [ orderedCornerCoordinates[ i ], orderedCornerCoordinates[ i + 1 ] ] );
        }
        else {
            wallSections.push( [ orderedCornerCoordinates[ i ], orderedCornerCoordinates[ 0 ] ] );
        }
    }
    return wallSections;
}

// References to dynamic d3 selections are stored here to help speed up SVG DOM interactions.
// The dynamic nature makes me want to use a reactive framework like Vue.
const d3Selections = {
    grid: null,
    gridRowLinesGroup: null,
    gridColumnLinesGroup: null,
    gridRowLines: null,
    diagramPoints: null,
    gridPointPreview: null,
    diagramWallLinesGroup: null,
    diagramWalls: null,
    diagramPreviewWalls: null
}

// Same as the d3 selections but for DOM references
const htmlSelections = {
    selectedWall: null
}


/*** BEGIN D3 GRID SELECTIONS ***/

// Setup the grid with the needed width and height for the whole workspace.
// This would need to be dynamic responding to the user changing the workspace size.
// TODO: Vue bindings on the #grig svg tag would make this reactive
d3Selections.grid = d3.select( "#grid" )
    .attr( "width", workspaceData.width )
    .attr( "height", workspaceData.height )
    .attr( "style", "border: solid 1px red;" );

// Setup svg groups for the grid row and columns lines as well as for the wall lines
d3Selections.gridRowLinesGroup = d3Selections.grid.append( "g" ).attr( "id", "grid-row-lines" );
d3Selections.gridColumnLinesGroup = d3Selections.grid.append( "g" ).attr( "id", "grid-column-lines" );
d3Selections.diagramWallLinesGroup = d3Selections.grid.append( "g" ).attr( "id", "diagram-wall-lines" );

// Draw the rows of the grid based on workspace row interval data and class the lines with .grid-line
// TODO: Vue template markup for a <line> svg element with a v-for directive would make these reactive
d3Selections.gridRowLines = d3Selections.gridRowLinesGroup
    .selectAll( "line" )
    .data( workspaceData.gridRowIntervals )
    .enter()
    .append( "line" )
    .attr('x1', 0)
    .attr('y1', ( interval ) => interval )
    .attr('x2', workspaceData.width )
    .attr('y2', ( interval ) => interval )
    .attr("class", "grid-line");

// Draw the columns of the grid based on workspace column interval data and class the lines with .grid-line
// TODO: Vue template markup for a <line> svg element with a v-for directive would make these reactive
d3Selections.gridColumnLines = d3Selections.gridColumnLinesGroup
    .selectAll( "line" )
    .data( workspaceData.gridColumnIntervals )
    .enter()
    .append( "line" )
    .attr('x1', ( interval ) => interval)
    .attr('y1', 0 )
    .attr('x2', ( interval ) => interval)
    .attr('y2', workspaceData.height  )
    .attr("class", "grid-line");

/*** BEGIN D3 DIAGRAM SELECTIONS ROUTINES ***/

drawDiagramCorners()
drawDiagramWalls();

function drawDiagramCorners() {
    
    // Draw the corners of the walls based on diagram data.
    // TODO: Vue template markup for a <circle> svg element with a v-for directive would make these reactive
    d3Selections.diagramPoints = d3Selections.grid
        .selectAll( 'circle' )
        .data( diagramData.orderedCornerCoordinates )
        .enter()
        .append( "circle" )
        .attr( 'cx', ( coordinates ) => coordinates[ 0 ] + workspaceData.padding )
        .attr( 'cy', ( coordinates ) => coordinates[ 1 ] + workspaceData.padding )
        .attr( 'r', 3 );
}

function drawDiagramWalls() {
    // Draw the walls based on diagram data for the corner points and class them with .wall-line and setup mouse clicks
    // TODO: Vue template markup for a <line> svg element with a v-for directive would make these reactive
    d3Selections.diagramWalls = d3Selections.diagramWallLinesGroup
    .selectAll( "line" )
    .data( () => diagramData.wallCoordinates( diagramData.orderedCornerCoordinates ) )
    .enter()
    .append( "line" )
    .attr('x1', ( wall ) => wall[ 0 ][ 0 ] + workspaceData.padding )
    .attr('y1', ( wall ) => wall[ 0 ][ 1 ] + workspaceData.padding )
    .attr('x2', ( wall ) => wall[ 1 ][ 0 ] + workspaceData.padding )
    .attr('y2', ( wall ) => wall[ 1 ][ 1 ] + workspaceData.padding )
    .attr("class", "wall-line")
    .on( "click", handleWallClick );
}

function redrawDiagramCorners() {
    
    d3Selections.diagramPoints.remove();
    
    drawDiagramCorners();
}

function redrawDiagramWalls() {
    
    if( d3Selections.diagramPreviewWalls ) {
        d3Selections.diagramPreviewWalls.forEach( wall => wall.remove() );
    }

    d3Selections.diagramWalls.remove();
    
    drawDiagramWalls();
}

function redrawDiagram() {
    
    redrawDiagramCorners();
    redrawDiagramWalls();
}

/*** BEGIN EVENT HANDLING SECTION ***/


function addGridPoint( mouseEvent ) {
    
    const x = mouseEvent.clientX;
    const y = mouseEvent.clientY;
    
    // Round the mouse click to the nearest gridInterval which creates a "snap-to" effect
    const gridPointX = Math.floor( x / workspaceData.gridInterval ) * workspaceData.gridInterval;
    const gridPointY = Math.floor( y / workspaceData.gridInterval ) * workspaceData.gridInterval;
    
    // Subtract the workspace padding from the grid points because corners are recorded grounded at [0,0]
    const snapToGridPoint = [ gridPointX - workspaceData.padding, gridPointY - workspaceData.padding ];
    
    // Splice the "snap-to" point into the ordered array between the start and end elements for the selected wall
    diagramData.orderedCornerCoordinates.splice( workspaceData.selectedWallCount + 1, 0, snapToGridPoint );
    
    window.removeEventListener( "mousemove", previewGridPoint );
    window.removeEventListener( "mousedown", addGridPoint );
    
    redrawDiagram();
}

function previewGridPoint( mouseEvent ) {
    const x = mouseEvent.clientX;
    const y = mouseEvent.clientY;
    
    // Subtract the workspace padding from the grid points because corners are recorded grounded at [0,0]
    const gridPointX = Math.floor( x / workspaceData.gridInterval ) * workspaceData.gridInterval;
    const gridPointY = Math.floor( y / workspaceData.gridInterval ) * workspaceData.gridInterval;
    
    workspaceData.gridPointPreviewCoordinates[ 0 ] = gridPointX;
    workspaceData.gridPointPreviewCoordinates[ 1 ] = gridPointY;
    
    if( d3Selections.gridPointPreview ) {
        d3Selections.gridPointPreview.remove();
    }
    
    if( d3Selections.diagramPreviewWalls ) {
        d3Selections.diagramPreviewWalls.forEach( wall => wall.remove() );
    }
    
    d3Selections.gridPointPreview = d3Selections.grid
        .append( "circle" )
        .attr( 'cx', workspaceData.gridPointPreviewCoordinates[ 0 ] )
        .attr( 'cy', workspaceData.gridPointPreviewCoordinates[ 1 ] )
        .attr( 'r', 3 );
    
    const startOfSelectedWall = diagramData.orderedCornerCoordinates[ workspaceData.selectedWallCount ];
    const endOfSelectedWall = workspaceData.selectedWallCount < diagramData.orderedCornerCoordinates.length - 1? 
          diagramData.orderedCornerCoordinates[ workspaceData.selectedWallCount + 1 ] : diagramData.orderedCornerCoordinates[ 0 ];
    
    const previewLine1 = d3Selections.grid
        .append( "line" )
        .attr('x1', startOfSelectedWall[ 0 ] + workspaceData.padding )
        .attr('y1', startOfSelectedWall[ 1 ] + workspaceData.padding )
        .attr('x2', gridPointX )
        .attr('y2', gridPointY )
        .attr("class", "wall-line preview");
    const previewLine2 = d3Selections.grid
        .append( "line" )
        .attr('x1', gridPointX )
        .attr('y1', gridPointY )
        .attr('x2', endOfSelectedWall[ 0 ] + workspaceData.padding )
        .attr('y2', endOfSelectedWall[ 1 ] + workspaceData.padding )
        .attr("class", "wall-line preview");
    
    d3Selections.diagramPreviewWalls = [ previewLine1, previewLine2 ];
    
    const distance1 = Math.hypot( ( startOfSelectedWall[ 0 ] + workspaceData.padding ) - gridPointX, ( endOfSelectedWall[ 1 ] + workspaceData.padding ) - gridPointY );
    const distance2 = Math.hypot( gridPointX - ( endOfSelectedWall[ 0 ] + workspaceData.padding ), gridPointY - ( startOfSelectedWall[ 1 ] + workspaceData.padding ) );
    
    const distance1X = ( ( startOfSelectedWall[ 0 ] + workspaceData.padding ) + gridPointX ) / 2;
    const distance1Y = ( ( startOfSelectedWall[ 1 ] + workspaceData.padding ) + gridPointY ) / 2;
    const distance1Text = d3Selections.grid
        .append( "text" )
        .attr( "x", distance1X + 15 )
        .attr( "y", distance1Y + 15 )
        .attr( "class", "wall-distance-text" )
        .text( ( Math.round( distance1 * 2 ) / 2 ).toFixed( 1 ) );
    d3Selections.diagramPreviewWalls.push( distance1Text );
    
    const distance2X = ( ( endOfSelectedWall[ 0 ] + workspaceData.padding ) + gridPointX ) / 2;
    const distance2Y = ( ( endOfSelectedWall[ 1 ] + workspaceData.padding ) + gridPointY ) / 2;
    const distance2Text = d3Selections.grid
        .append( "text" )
        .attr( "x", distance2X - 15 )
        .attr( "y", distance2Y - 15 )
        .attr( "class", "wall-distance-text" )
        .text( ( Math.round( distance2 * 2 ) / 2 ).toFixed( 1 ) );
    d3Selections.diagramPreviewWalls.push( distance2Text );
}

function handleWallClick( wallCoordinates, wallCount, htmlWallLineElements ) {
    // Start by removing the selected class from the currently selected wall
    if( htmlSelections.selectedWall ) {
        htmlSelections.selectedWall.classList.remove( "selected" );
    }
    
    if( htmlSelections.selectedWall === htmlWallLineElements[ wallCount ] ) {
        // If the currently selected wall was the clicked wall, then there will no longer be a selected wall
        htmlSelections.selectedWall = null;
        workspaceData.selectedWallCount = wallCount;
        
        window.removeEventListener( "mousemove", previewGridPoint );
        window.removeEventListener( "mousedown", addGridPoint );
    }
    else {
        // A different wall was clicked than what is currently selected so set the clicked wall as the selected wall
        htmlSelections.selectedWall = htmlWallLineElements[ wallCount ];
        htmlSelections.selectedWall.classList.add( "selected" );
        
        workspaceData.selectedWallCount = wallCount;
        
        window.addEventListener( "mousemove", previewGridPoint );
        window.addEventListener( "mousedown", addGridPoint );
    }
}

function addWallObject() {
    const startOfSelectedWall = diagramData.orderedCornerCoordinates[ workspaceData.selectedWallCount ];
    
    const endOfSelectedWall = workspaceData.selectedWallCount < diagramData.orderedCornerCoordinates.length - 1? 
          diagramData.orderedCornerCoordinates[ workspaceData.selectedWallCount + 1 ] : diagramData.orderedCornerCoordinates[ 0 ];
    
    const distanceX = ( ( endOfSelectedWall[ 0 ] + workspaceData.padding ) + startOfSelectedWall[ 0 ] + workspaceData.padding ) / 2;
    const distanceY = ( ( endOfSelectedWall[ 1 ] + workspaceData.padding ) + startOfSelectedWall[ 1 ]  + workspaceData.padding ) / 2;
    
    const object = d3Selections.grid
        .append( "rect" )
        .attr( "x", distanceX - 30 )
        .attr( "y", distanceY - 49 )
        .attr( "width", 60 )
        .attr( "height", 60 )
        .attr( "class", "diagram-object-door" );
}