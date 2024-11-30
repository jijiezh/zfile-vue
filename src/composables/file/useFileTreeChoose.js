import { ref } from 'vue'
import useHeaderStorageList from '~/composables/header/useHeaderStorageList'
import { loadFileListReq } from '~/api/home'
import useFileSelect from '~/composables/file/useFileSelect'
import common from '~/common'
import { ElMessage } from 'element-plus'
import MessageBox from '~/components/messageBox/messageBox'
import useStorageConfigStore from '~/stores/storage-config'
import useFilePwd from '~/composables/file/useFilePwd'
import { copyFile, copyfolder } from '~/api/file-operator'
import useRouterData from '~/composables/useRouterData'

let { storageKey } = useRouterData()

let { getPathPwd, putPathPwd } = useFilePwd()

let storageConfigStore = useStorageConfigStore()

const { selectRow, selectRows, selectStatistics, clearSelection } =
	useFileSelect()
const fileTreeDialogVisible = ref(false)

const fileTree = ref([])

const { loadStorageSourceList, storageList } = useHeaderStorageList()

export default function useFileTreeChoose() {
	// 打开文件树弹窗
	const openFileTreeDialogVisible = () => {
		fileTreeDialogVisible.value = true
	}
	// 关闭文件树弹窗
	const closeFileTreeDialogVisible = () => {
		fileTreeDialogVisible.value = false
	}

	// 加载文件列表
	async function loadFileListReqAll(item) {
		let param = {
			orderBy: 'name',
			orderDirection: 'asc',
			password: '',
			path: item.path,
		}
		let response = await loadFileListReq(param)
		let data = response.data
		let files = data.files
		files.forEach((f) => {
			if (f.type === 'FOLDER') {
				let obj = {
					name: f.name,
					path: `${f.path}/${f.name}`,
					children: [],
				}
				loadFileListReqAll(obj)
				item.children.push(obj)
			}
		})
		return item
	}

	function loadFileListByPath(param, resolve, reject) {
		loadFileListReq(param)
			.then((response) => {
				let passwordPattern = response.data.passwordPattern

				if (param?.rememberPassword) {
					putPathPwd(passwordPattern, param.password)
				}
				let data = response.data
				let files = data.files
				let arr = []
				files.forEach((f) => {
					if (f.type === 'FOLDER') {
						let path = f.path
						path === '/' && (path = '')
						let obj = {
							name: f.name,
							path: `${path}/${f.name}`,
							isLeaf: false,
							children: [],
						}
						arr.push(obj)
					}
				})
				resolve(arr)
			})
			.catch((error) => {
				console.log(error)
				let data = error.response.data
				// 如果需要密码或密码错误进行提示, 并弹出输入密码的框.
				if (data.code === common.responseCode.INVALID_PASSWORD) {
					ElMessage.warning('密码错误，请重新输入！')
					popPassword(param, resolve, reject)
				} else if (data.code === common.responseCode.REQUIRED_PASSWORD) {
					popPassword(param, resolve, reject)
				} else {
					ElMessage.error(data.msg)
				}
			})
	}

	// 获取文件夹下的子文件夹
	function getChildrenFolder(node, resolve, reject) {
		if (node.level === 0) {
			loadStorageSourceList().then(() => {
				resolve(
					storageList.value
						.filter((v) => v.key === storageKey.value)
						.map((item) => {
							return {
								name: item.name,
								path: '/',
								isLeaf: false,
								children: [],
							}
						})
				)
			})
		} else {
			let data = node.data
			let param = {
				orderBy: 'name',
				orderDirection: 'asc',
				password: getPathPwd(data.path),
				path: data.path,
				storageKey: storageKey.value,
			}
			loadFileListByPath(param, resolve, reject)
		}
	}

	// 选取文件后移动文件
	function moveFile(treeCheck) {
		if (treeCheck.length === 0) {
			ElMessage.warning('请至少选择一个文件夹')
			return
		}
		let pathArr = treeCheck.map((item) => {
			return {
				path: item.path,
				name: item.name,
			}
		})
		let filePathArr = selectRows.value.map((item) => {
			return {
				...item,
			}
		})
		filePathArr.forEach((item) => {
			let path = item.path
			let type = item.type
			let primiseArr = []
			let paramsArr = []
			pathArr.forEach((p) => {
				let params = {
					path: path,
					name: item.name,
					storageKey: storageKey.value,
					targetPath: p.path,
					targetName: item.name,
				}
				paramsArr.push(params)
				if (type === 'FOLDER') {
					primiseArr.push(copyfolder(params))
				} else if (type === 'FILE') {
					primiseArr.push(copyFile(params))
				}
			})

			Promise.all(primiseArr)
				.then((resArr) => {
					clearSelection()
					closeFileTreeDialogVisible()
				})
				.catch((err) => {
					console.log(err)
				})
				.finally(() => {
					clearSelection()
					closeFileTreeDialogVisible()
				})
		})
	}

	// 显示密码输入框
	let popPassword = (param, resolve, reject) => {
		// 如果输入了密码, 则写入到 sessionStorage 缓存中, 并重新调用加载文件.
		MessageBox.prompt('此文件夹已加密，请输入密码：', '提示', {
			confirmButtonText: '确定',
			cancelButtonText: '取消',
			inputType: 'password',
			checkbox: true,
			defaultChecked: storageConfigStore.globalConfig.defaultSavePwd,
			inputDefault: getPathPwd(param.path),
			checkboxLabel: '记住密码',
			customClass: 'chooseFileTree-password',
			inputValidator(val) {
				return !!val
			},
			inputErrorMessage: '密码不能为空.',
		})
			.then(({ value, checkbox }) => {
				loadFileListByPath(
					{
						...param,
						password: value,
						rememberPassword: checkbox,
					},
					resolve,
					reject
				)
			})
			.catch((err) => {
				if (err.checkbox === false) {
					reject()
				}
			})
	}

	return {
		fileTreeDialogVisible,
		openFileTreeDialogVisible,
		closeFileTreeDialogVisible,
		fileTree,
		getChildrenFolder,
		moveFile,
	}
}
