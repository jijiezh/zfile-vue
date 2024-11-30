<script setup lang="ts">
import useFileTreeChoose from '~/composables/file/useFileTreeChoose'

const { getChildrenFolder, closeFileTreeDialogVisible, moveFile } =
	useFileTreeChoose()

const props = {
	label: 'name',
	children: 'children',
	isLeaf: 'leaf',
}
const loadNode = (treeNode: any, resolve: any, reject: any) => {
	getChildrenFolder(treeNode, resolve, reject)
}
const treeRef = ref(null)
const success = () => {
	let treeCheck = treeRef.value?.getCheckedNodes()
	moveFile(treeCheck)
}
</script>

<template>
	<div class="chooseFileTree">
		<div class="chooseFileTree-header">选择文件夹：</div>
		<div class="chooseFileTree-tree">
			<el-tree
				ref="treeRef"
				:check-strictly="true"
				show-checkbox
				:props="props"
				:load="loadNode"
				lazy
			/>
		</div>
		<div class="chooseFileTree-footer">
			<el-button @click="closeFileTreeDialogVisible">取消</el-button>
			<el-button type="primary" @click="success">确定</el-button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.chooseFileTree {
	height: 80vh;
	position: relative;
	padding: 30px 0;
}

.chooseFileTree-header {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 30px;
}

.chooseFileTree-tree {
	height: 100%;
	overflow: auto;
}

.chooseFileTree-footer {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: 30px;
	text-align: right;
}
</style>
